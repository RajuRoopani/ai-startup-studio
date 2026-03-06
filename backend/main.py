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
import xml.etree.ElementTree as ET
from contextlib import asynccontextmanager
from datetime import date, timedelta

import anthropic
import asyncpg
import httpx
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
    SparkIdea,
    SparkIdeasRequest,
    SparkIdeasResponse,
    TrendItem,
    TrendsResponse,
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


# ─────────────────────────────────────────────
# Idea Radar — trend fetching helpers
# ─────────────────────────────────────────────

async def _fetch_github_trends(client: httpx.AsyncClient) -> list:
    since = (date.today() - timedelta(days=30)).isoformat()
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    r = await client.get(
        "https://api.github.com/search/repositories",
        params={"q": f"created:>{since} stars:>50", "sort": "stars", "order": "desc", "per_page": 9},
        headers=headers,
    )
    r.raise_for_status()
    items = r.json().get("items", [])
    return [
        TrendItem(
            id=f"gh_{repo['id']}",
            source="github",
            title=repo["full_name"],
            description=repo.get("description") or "No description",
            url=repo["html_url"],
            signal=f"⭐ {repo['stargazers_count']:,} stars",
            tags=(repo.get("topics") or [])[:4] + ([repo["language"]] if repo.get("language") else []),
        )
        for repo in items
        if repo.get("description")
    ][:8]


async def _fetch_hn_item(client: httpx.AsyncClient, story_id: int):
    r = await client.get(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json")
    r.raise_for_status()
    item = r.json()
    if not item or item.get("type") != "story" or not item.get("title"):
        return None
    return TrendItem(
        id=f"hn_{item['id']}",
        source="hn",
        title=item["title"],
        description=item.get("url") or f"https://news.ycombinator.com/item?id={item['id']}",
        url=item.get("url") or f"https://news.ycombinator.com/item?id={item['id']}",
        signal=f"▲ {item.get('score', 0):,} pts · {item.get('descendants', 0)} comments",
        tags=[],
    )


async def _fetch_hn_trends(client: httpx.AsyncClient) -> list:
    r = await client.get("https://hacker-news.firebaseio.com/v0/topstories.json")
    r.raise_for_status()
    ids = r.json()[:12]
    items = await asyncio.gather(*[_fetch_hn_item(client, sid) for sid in ids], return_exceptions=True)
    return [i for i in items if i and not isinstance(i, Exception)][:8]


async def _fetch_arxiv_trends(client: httpx.AsyncClient) -> list:
    r = await client.get(
        "http://export.arxiv.org/api/query",
        params={
            "search_query": "(cat:cs.AI OR cat:cs.LG OR cat:cs.CL) AND (ti:agent OR ti:foundation OR ti:reasoning OR ti:multimodal)",
            "sortBy": "submittedDate",
            "sortOrder": "descending",
            "max_results": 8,
        },
    )
    r.raise_for_status()
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(r.text)
    result = []
    for entry in root.findall("atom:entry", ns):
        title_el = entry.find("atom:title", ns)
        summary_el = entry.find("atom:summary", ns)
        id_el = entry.find("atom:id", ns)
        if not title_el or not summary_el:
            continue
        title_text = title_el.text.strip().replace("\n", " ")
        summary_text = (summary_el.text or "").strip().replace("\n", " ")[:220]
        result.append(TrendItem(
            id=f"ax_{abs(hash(title_text)) % 999999}",
            source="arxiv",
            title=title_text,
            description=summary_text + "…",
            url=id_el.text.strip() if id_el is not None else "https://arxiv.org",
            signal="📄 AI Research",
            tags=["AI", "Research"],
        ))
    return result[:7]


# ─────────────────────────────────────────────
# Idea Radar endpoints
# ─────────────────────────────────────────────

@app.get("/api/trends", response_model=TrendsResponse)
async def get_trends() -> TrendsResponse:
    async with httpx.AsyncClient(timeout=20.0) as client:
        github_task = asyncio.create_task(_fetch_github_trends(client))
        hn_task = asyncio.create_task(_fetch_hn_trends(client))
        arxiv_task = asyncio.create_task(_fetch_arxiv_trends(client))
        results = await asyncio.gather(github_task, hn_task, arxiv_task, return_exceptions=True)

    trends: list = []
    for r in results:
        if not isinstance(r, Exception):
            trends.extend(r)
        else:
            logger.warning("Trend fetch error: %s", r)
    return TrendsResponse(trends=trends)


@app.post("/api/spark-ideas", response_model=SparkIdeasResponse)
async def spark_ideas(req: SparkIdeasRequest) -> SparkIdeasResponse:
    if not req.trends:
        raise HTTPException(400, "Select at least one trend signal")

    trends_text = "\n".join(
        f"[{t.source.upper()}] {t.title}: {t.description} ({t.signal})"
        for t in req.trends
    )

    prompt = f"""You are a world-class startup strategist and venture scout. Analyze these real trend signals from GitHub, Hacker News, and AI research:

{trends_text}

Generate exactly 5 startup ideas that:
1. Are DIRECTLY inspired by one or more of these specific trend signals
2. Solve painful, real problems people actively pay to solve
3. Have a clear path to $1B+ valuation (massive market or winner-take-all dynamics)
4. Are technically feasible to build today using current AI/cloud infrastructure
5. Have strong viral or bottom-up distribution potential

Return ONLY a valid JSON array (no markdown, no explanation) of exactly 5 objects with this shape:
[
  {{
    "name": "2-3 word catchy product name",
    "tagline": "one sentence that makes someone immediately understand the value",
    "problem": "specific painful problem this solves — be concrete about who suffers and how badly (2-3 sentences)",
    "solution": "how the product works and what makes it 10x better than alternatives (2-3 sentences)",
    "why_now": "what makes this possible or urgent today that wasn't true 2 years ago (1-2 sentences)",
    "market": "who are the paying customers and estimated TAM with reasoning",
    "revenue": "pricing model and how it scales to $1B ARR",
    "inspiration": ["exact title of trend 1 that inspired this", "exact title of trend 2"]
  }}
]"""

    response = await state.claude.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    ideas_data = json.loads(text)
    ideas = [SparkIdea(**item) for item in ideas_data]
    return SparkIdeasResponse(ideas=ideas)
