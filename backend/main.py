"""
AI Startup Studio — FastAPI backend.

Endpoints:
  POST /api/sessions            — submit an idea, start the studio run
  GET  /api/sessions/{id}       — session detail + all artifacts
  GET  /api/sessions/{id}/stream — SSE: live agent event stream
  GET  /api/sessions/slug/{slug} — fetch session by share slug
  GET  /health                  — readiness probe
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import pathlib
import random
import string
import uuid
from contextlib import asynccontextmanager

import anthropic
import asyncpg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents.orchestrator import run_studio
from db import create_pool, ensure_schema
from models import (
    AgentMessageOut,
    ArtifactOut,
    CreateSessionRequest,
    SessionDetail,
    SessionResponse,
)

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s  [studio]  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

DB_URL           = os.environ["DATABASE_URL"]
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GITHUB_TOKEN      = os.environ.get("GITHUB_TOKEN", "")
ALLOWED_ORIGINS   = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

_SCHEMA_PATH = pathlib.Path(__file__).parent.parent / "shared" / "schema.sql"


# ─────────────────────────────────────────────
# App state
# ─────────────────────────────────────────────

class AppState:
    db: asyncpg.Pool
    claude: anthropic.AsyncAnthropic
    # session_id → asyncio.Queue of SSE event dicts
    sse_queues: dict[str, list[asyncio.Queue]] = {}


state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    state.db = await create_pool(DB_URL)
    if _SCHEMA_PATH.exists():
        await ensure_schema(state.db, _SCHEMA_PATH.read_text())
    else:
        logger.warning("schema.sql not found at %s — skipping auto-migration", _SCHEMA_PATH)

    if GITHUB_TOKEN and not ANTHROPIC_API_KEY:
        state.claude = anthropic.AsyncAnthropic(
            api_key="github-copilot",
            base_url="https://api.githubcopilot.com",
            default_headers={
                "Authorization": f"Bearer {GITHUB_TOKEN}",
                "Copilot-Integration-Id": "vscode-chat",
            },
        )
    else:
        state.claude = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    state.sse_queues = {}
    logger.info("AI Startup Studio online.")
    yield
    await state.db.close()


app = FastAPI(title="AI Startup Studio", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _make_slug(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


async def _broadcast(session_id: str, event: dict) -> None:
    for q in state.sse_queues.get(session_id, []):
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass


def _sse_format(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/sessions", response_model=SessionResponse)
async def create_session(req: CreateSessionRequest) -> SessionResponse:
    idea = req.idea.strip()
    if not idea:
        raise HTTPException(400, "idea cannot be empty")
    if len(idea) > 2000:
        raise HTTPException(400, "idea must be under 2000 characters")

    session_id = str(uuid.uuid4())
    slug = _make_slug()

    async with state.db.acquire() as conn:
        await conn.execute(
            "INSERT INTO sessions (id, idea, status, share_slug) VALUES ($1,$2,'pending',$3)",
            session_id, idea, slug,
        )

    # Kick off studio run as a background task
    asyncio.create_task(
        _run_session(session_id, idea),
        name=f"studio-{session_id[:8]}",
    )

    return SessionResponse(session_id=session_id, share_slug=slug, status="pending")


async def _run_session(session_id: str, idea: str) -> None:
    """Background task: run agents, broadcast SSE events."""
    # Set up a fan-out queue for this session
    session_queue: asyncio.Queue = asyncio.Queue(maxsize=500)
    state.sse_queues.setdefault(session_id, [])

    async with state.db.acquire() as conn:
        await conn.execute(
            "UPDATE sessions SET status='running' WHERE id=$1", session_id
        )

    # Forward events from agent orchestrator to all SSE subscribers
    async def _fan_out() -> None:
        while True:
            event = await session_queue.get()
            await _broadcast(session_id, event)
            if event.get("type") in ("session_complete", "error"):
                break

    fan_task = asyncio.create_task(_fan_out())

    await run_studio(
        session_id=session_id,
        idea=idea,
        db=state.db,
        stream_queue=session_queue,
        anthropic_client=state.claude,
    )

    await fan_task

    # Drain any remaining events
    await asyncio.sleep(1)
    state.sse_queues.pop(session_id, None)


@app.get("/api/sessions/{session_id}/stream")
async def stream_session(session_id: str):
    """SSE stream for a live studio session."""
    # Verify session exists
    async with state.db.acquire() as conn:
        row = await conn.fetchrow("SELECT status FROM sessions WHERE id=$1", session_id)
    if not row:
        raise HTTPException(404, "Session not found")

    # If already complete, return a single done event
    if row["status"] == "complete":
        async def _done_gen():
            yield _sse_format({"type": "session_complete", "session_id": session_id, "phase": 4})
        return StreamingResponse(_done_gen(), media_type="text/event-stream",
                                  headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    q: asyncio.Queue = asyncio.Queue(maxsize=500)
    state.sse_queues.setdefault(session_id, []).append(q)

    async def event_gen():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield _sse_format(event)
                    if event.get("type") in ("session_complete", "error"):
                        break
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            try:
                state.sse_queues.get(session_id, []).remove(q)
            except ValueError:
                pass

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/sessions/{session_id}", response_model=SessionDetail)
async def get_session(session_id: str) -> SessionDetail:
    async with state.db.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM sessions WHERE id=$1", session_id)
        if not row:
            raise HTTPException(404, "Session not found")

        artifact_rows = await conn.fetch(
            "SELECT artifact_key, title, content, created_at FROM artifacts WHERE session_id=$1 ORDER BY created_at",
            session_id,
        )
        msg_rows = await conn.fetch(
            "SELECT id, agent_role, phase, content, created_at FROM agent_messages WHERE session_id=$1 ORDER BY created_at",
            session_id,
        )

    return SessionDetail(
        id=str(row["id"]),
        idea=row["idea"],
        status=row["status"],
        share_slug=row["share_slug"] or "",
        created_at=row["created_at"].isoformat(),
        completed_at=row["completed_at"].isoformat() if row["completed_at"] else None,
        artifacts=[
            ArtifactOut(
                key=r["artifact_key"],
                title=r["title"],
                content=r["content"],
                created_at=r["created_at"].isoformat(),
            )
            for r in artifact_rows
        ],
        messages=[
            AgentMessageOut(
                id=r["id"],
                agent_role=r["agent_role"],
                phase=r["phase"],
                content=r["content"],
                created_at=r["created_at"].isoformat(),
            )
            for r in msg_rows
        ],
    )


@app.get("/api/sessions/slug/{slug}", response_model=SessionDetail)
async def get_session_by_slug(slug: str) -> SessionDetail:
    async with state.db.acquire() as conn:
        row = await conn.fetchrow("SELECT id FROM sessions WHERE share_slug=$1", slug)
    if not row:
        raise HTTPException(404, "Session not found")
    return await get_session(str(row["id"]))
