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
import base64
import json
import logging
import os
import pathlib
import random
import re
import string
import uuid
import xml.etree.ElementTree as ET
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone

import anthropic
import asyncpg
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents.orchestrator import run_studio
from db import create_pool, ensure_schema
from models import (
    AgentMessageOut,
    ArtifactOut,
    CreateSessionRequest,
    IdeaRecord,
    IdeasHistoryResponse,
    SessionDetail,
    SessionListItem,
    SessionListResponse,
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

DB_URL            = os.environ["DATABASE_URL"]
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GITHUB_TOKEN      = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO       = os.environ.get("GITHUB_REPO", "RajuRoopani/ai-startup-studio")
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


@app.get("/api/sessions", response_model=SessionListResponse)
async def list_sessions(limit: int = 50, status: str = "") -> SessionListResponse:
    """Return a lightweight list of sessions for the history page."""
    async with state.db.acquire() as conn:
        if status:
            rows = await conn.fetch(
                """SELECT s.id, s.idea, s.status, s.share_slug, s.created_at, s.completed_at,
                          COUNT(a.id) AS artifact_count
                   FROM sessions s
                   LEFT JOIN artifacts a ON a.session_id = s.id
                   WHERE s.status = $1
                   GROUP BY s.id
                   ORDER BY s.created_at DESC
                   LIMIT $2""",
                status, min(limit, 200),
            )
        else:
            rows = await conn.fetch(
                """SELECT s.id, s.idea, s.status, s.share_slug, s.created_at, s.completed_at,
                          COUNT(a.id) AS artifact_count
                   FROM sessions s
                   LEFT JOIN artifacts a ON a.session_id = s.id
                   GROUP BY s.id
                   ORDER BY s.created_at DESC
                   LIMIT $1""",
                min(limit, 200),
            )
    return SessionListResponse(sessions=[
        SessionListItem(
            id=str(r["id"]),
            idea=r["idea"],
            status=r["status"],
            share_slug=r["share_slug"] or "",
            created_at=r["created_at"].isoformat(),
            completed_at=r["completed_at"].isoformat() if r["completed_at"] else None,
            artifact_count=r["artifact_count"],
        )
        for r in rows
    ])


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
    """Fetch latest AI/ML papers from arXiv (cs.AI + cs.LG categories)."""
    r = await client.get(
        "https://export.arxiv.org/api/query",
        params={
            "search_query": "cat:cs.AI OR cat:cs.LG OR cat:cs.CL",
            "sortBy": "submittedDate",
            "sortOrder": "descending",
            "max_results": 10,
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
        title_text = " ".join(title_el.text.strip().split())
        summary_text = " ".join((summary_el.text or "").strip().split())[:240]
        paper_url = id_el.text.strip() if id_el is not None else "https://arxiv.org"
        # Convert arxiv abstract URL to HTML view
        paper_url = paper_url.replace("http://arxiv.org/abs/", "https://arxiv.org/abs/")
        result.append(TrendItem(
            id=f"ax_{abs(hash(title_text)) % 9999999}",
            source="arxiv",
            title=title_text,
            description=summary_text + "…",
            url=paper_url,
            signal="📄 arXiv preprint",
            tags=["AI", "Research"],
        ))
    return result[:8]


async def _fetch_hf_papers(client: httpx.AsyncClient) -> list:
    """Fetch trending AI papers from HuggingFace Daily Papers."""
    r = await client.get(
        "https://huggingface.co/api/daily_papers",
        params={"limit": 10},
    )
    r.raise_for_status()
    items = r.json()
    result = []
    for item in items:
        paper = item.get("paper") or {}
        title = (item.get("title") or paper.get("title") or "").strip()
        summary = " ".join((item.get("summary") or paper.get("abstract") or "").split())[:220]
        if not title:
            continue
        arxiv_id = paper.get("id") or ""
        url = f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else "https://huggingface.co/papers"
        comments = item.get("numComments") or 0
        upvotes = paper.get("upvotes") or 0
        signal = f"💬 {comments} comments" if comments else f"👍 {upvotes} upvotes"
        result.append(TrendItem(
            id=f"hf_{arxiv_id or abs(hash(title)) % 9999999}",
            source="arxiv",  # grouped under AI Research in the UI
            title=title,
            description=summary + ("…" if summary else ""),
            url=url,
            signal=signal,
            tags=["HuggingFace", "Daily Papers", "Research"],
        ))
    return result[:7]


# ─────────────────────────────────────────────
# Idea Radar endpoints
# ─────────────────────────────────────────────

async def _resolve_arxiv_url(client: httpx.AsyncClient, url: str) -> TrendItem:
    """Fetch a specific arXiv paper by its URL (abs or pdf)."""
    # Extract the arXiv ID from various URL forms:
    #   https://arxiv.org/abs/2603.05240
    #   https://arxiv.org/abs/2603.05240v1
    #   https://arxiv.org/pdf/2603.05240v1
    #   https://arxiv.org/pdf/2603.05240v1.pdf
    m = re.search(r"arxiv\.org/(?:abs|pdf|html)/([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)", url)
    if not m:
        raise ValueError(f"Cannot extract arXiv ID from URL: {url}")
    arxiv_id = m.group(1).split("v")[0]  # strip version suffix for API lookup
    r = await client.get(
        "https://export.arxiv.org/api/query",
        params={"id_list": arxiv_id, "max_results": 1},
    )
    r.raise_for_status()
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(r.text)
    entries = root.findall("atom:entry", ns)
    if not entries:
        raise ValueError(f"arXiv paper not found: {arxiv_id}")
    entry = entries[0]
    title_el   = entry.find("atom:title",   ns)
    summary_el = entry.find("atom:summary", ns)
    id_el      = entry.find("atom:id",      ns)
    title_text   = " ".join((title_el.text   or "").strip().split())
    summary_text = " ".join((summary_el.text or "").strip().split())[:320]
    paper_url    = (id_el.text or url).strip().replace("http://arxiv.org/abs/", "https://arxiv.org/abs/")
    return TrendItem(
        id=f"ax_{abs(hash(arxiv_id)) % 9999999}",
        source="arxiv",
        title=title_text,
        description=summary_text + ("…" if len(summary_text) == 320 else ""),
        url=paper_url,
        signal="📄 arXiv preprint",
        tags=["AI", "Research"],
    )


async def _resolve_github_url(client: httpx.AsyncClient, url: str) -> TrendItem:
    """Fetch a GitHub repo by its URL."""
    m = re.search(r"github\.com/([^/]+/[^/?\s#]+)", url)
    if not m:
        raise ValueError(f"Cannot extract repo from URL: {url}")
    repo_path = m.group(1).rstrip("/")
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    r = await client.get(f"https://api.github.com/repos/{repo_path}", headers=headers)
    r.raise_for_status()
    repo = r.json()
    return TrendItem(
        id=f"gh_{repo['id']}",
        source="github",
        title=repo["full_name"],
        description=repo.get("description") or "No description",
        url=repo["html_url"],
        signal=f"⭐ {repo.get('stargazers_count', 0):,} stars",
        tags=(repo.get("topics") or [])[:4] + ([repo["language"]] if repo.get("language") else []),
    )


async def _resolve_hn_url(client: httpx.AsyncClient, url: str) -> TrendItem:
    """Fetch a Hacker News item by its URL."""
    m = re.search(r"news\.ycombinator\.com/item\?id=(\d+)", url)
    if not m:
        raise ValueError(f"Cannot extract HN item ID from URL: {url}")
    return await _fetch_hn_item(client, int(m.group(1)))


class ResolveUrlRequest(BaseModel):
    url: str


@app.post("/api/trends/resolve", response_model=TrendItem)
async def resolve_trend_url(req: ResolveUrlRequest) -> TrendItem:
    """Accept any arXiv / GitHub / HN URL and return it as a TrendItem."""
    url = req.url.strip()
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        if "arxiv.org" in url:
            return await _resolve_arxiv_url(client, url)
        if "github.com" in url:
            return await _resolve_github_url(client, url)
        if "ycombinator.com" in url or "news.ycombinator" in url:
            result = await _resolve_hn_url(client, url)
            if result is None:
                raise HTTPException(400, "HN item not found or not a story")
            return result
        raise HTTPException(400, "URL must be an arXiv, GitHub, or Hacker News link")


@app.get("/api/trends", response_model=TrendsResponse)
async def get_trends() -> TrendsResponse:
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        results = await asyncio.gather(
            _fetch_github_trends(client),
            _fetch_hn_trends(client),
            _fetch_arxiv_trends(client),
            _fetch_hf_papers(client),
            return_exceptions=True,
        )

    trends: list = []
    for r in results:
        if not isinstance(r, Exception):
            trends.extend(r)
        else:
            logger.warning("Trend fetch partial error: %s", r)
    return TrendsResponse(trends=trends)


def _format_idea_markdown(idea: SparkIdea, idea_id: str, created_at, trends: list) -> str:
    """Render a single idea as rich GitHub Flavored Markdown."""
    signals_md = "\n".join(
        f"| [{t.title[:80]}]({t.url}) | {t.source.upper()} | {t.signal} |"
        for t in trends
    )
    inspiration_bullets = "\n".join(f"- {i}" for i in idea.inspiration)
    date_str = created_at.strftime("%Y-%m-%d") if hasattr(created_at, "strftime") else str(created_at)[:10]

    return f"""# 🚀 {idea.name}

> **{idea.tagline}**

---

## 💡 The Problem

{idea.problem}

## ⚡ The Solution

{idea.solution}

## ⏰ Why Now

{idea.why_now}

## 📊 Market

{idea.market}

## 💰 Revenue Model

{idea.revenue}

---

## 🔗 Inspired By

{inspiration_bullets}

## 📡 Source Trend Signals

| Title | Source | Signal |
|-------|--------|--------|
{signals_md}

---

*Generated on {date_str} · ID `{idea_id}` · [AI Startup Studio](https://github.com/RajuRoopani/ai-startup-studio) Idea Radar · Powered by Claude Opus*
"""


async def _push_idea_to_github(
    client: httpx.AsyncClient,
    idea: SparkIdea,
    idea_id: str,
    created_at,
    trends: list,
) -> str | None:
    """Push a generated idea as a markdown file to the GitHub repo. Returns the HTML URL."""
    if not GITHUB_TOKEN:
        return None
    content_md = _format_idea_markdown(idea, idea_id, created_at, trends)
    safe_name = re.sub(r"[^a-z0-9]+", "-", idea.name.lower()).strip("-")[:40]
    date_str = created_at.strftime("%Y-%m-%d") if hasattr(created_at, "strftime") else str(created_at)[:10]
    filename = f"generated-ideas/{date_str}-{safe_name}-{idea_id[:6]}.md"
    encoded = base64.b64encode(content_md.encode()).decode()
    resp = await client.put(
        f"https://api.github.com/repos/{GITHUB_REPO}/contents/{filename}",
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        json={
            "message": f"✦ idea: {idea.name} — {idea.tagline[:70]}",
            "content": encoded,
        },
        timeout=15.0,
    )
    if resp.status_code in (200, 201):
        return resp.json()["content"]["html_url"]
    logger.warning("GitHub push failed for idea %s: %s %s", idea_id, resp.status_code, resp.text[:200])
    return None


@app.post("/api/spark-ideas", response_model=SparkIdeasResponse)
async def spark_ideas(req: SparkIdeasRequest) -> SparkIdeasResponse:
    if not req.trends:
        raise HTTPException(400, "Select at least one trend signal")

    source_labels = {"github": "GitHub", "hn": "Hacker News", "arxiv": "AI Research Paper"}
    trends_text = "\n".join(
        f"[{source_labels.get(t.source, t.source.upper())}] {t.title}: {t.description} ({t.signal})"
        for t in req.trends
    )

    direction_block = ""
    if req.direction and req.direction.strip():
        direction_block = f"""
## Founder's Direction

The founder has given this specific guidance — treat it as the primary constraint:
> {req.direction.strip()}

Every idea MUST align with this direction. Interpret it broadly but stay true to the intent.
"""

    prompt = f"""You are a world-class startup strategist and venture scout. Analyze these real trend signals from GitHub, Hacker News, and cutting-edge AI/ML research papers:

{trends_text}
{direction_block}
Generate exactly 5 startup ideas that:
1. Are DIRECTLY inspired by one or more of these specific signals — reference the research papers or repos by name
2. Solve painful, real problems people and businesses actively pay to solve
3. Have a clear path to $1B+ valuation (massive market, strong network effects, or winner-take-all dynamics)
4. Are technically feasible to build today using current AI/cloud infrastructure
5. Have strong viral or bottom-up distribution potential

For ideas inspired by research papers: explain how you would productise the academic technique into a commercial product.

Return ONLY a valid JSON array (no markdown, no explanation) of exactly 5 objects:
[
  {{
    "name": "2-3 word catchy product name",
    "tagline": "one sentence that makes someone immediately understand the value",
    "problem": "specific painful problem this solves — be concrete about who suffers and how badly (2-3 sentences)",
    "solution": "how the product works and what makes it 10x better than alternatives (2-3 sentences)",
    "why_now": "what makes this possible or urgent today that wasn't true 2 years ago (1-2 sentences)",
    "market": "who are the paying customers and estimated TAM with reasoning",
    "revenue": "pricing model and how it scales to $1B ARR",
    "inspiration": ["exact title of paper/repo/story 1 that inspired this", "exact title 2"]
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
    created_at = datetime.now(timezone.utc)  # keep as datetime — asyncpg needs datetime, not str

    # Persist + push to GitHub in parallel
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as gh_client:
        save_tasks = []
        for idea in ideas:
            idea_id = str(uuid.uuid4())
            save_tasks.append(_save_and_push_idea(gh_client, idea, idea_id, created_at, req.trends))
        results = await asyncio.gather(*save_tasks, return_exceptions=True)
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                logger.error("Failed to save/push idea %d: %s", i, r)

    return SparkIdeasResponse(ideas=ideas)


async def _save_and_push_idea(
    client: httpx.AsyncClient,
    idea: SparkIdea,
    idea_id: str,
    created_at,
    trends: list,
) -> None:
    """Save idea to DB and push markdown to GitHub concurrently."""
    github_url, _ = await asyncio.gather(
        _push_idea_to_github(client, idea, idea_id, created_at, trends),
        _save_idea_to_db(idea, idea_id, created_at, trends),
        return_exceptions=True,
    )
    # Update DB with GitHub URL if push succeeded
    if isinstance(github_url, str):
        async with state.db.acquire() as conn:
            await conn.execute(
                "UPDATE generated_ideas SET github_url=$1 WHERE id=$2",
                github_url, idea_id,
            )


async def _save_idea_to_db(idea: SparkIdea, idea_id: str, created_at, trends: list) -> None:
    trend_signals_json = json.dumps([t.model_dump() for t in trends])
    inspiration_json = json.dumps(idea.inspiration)
    async with state.db.acquire() as conn:
        await conn.execute(
            """INSERT INTO generated_ideas
               (id, idea_name, tagline, problem, solution, why_now, market, revenue,
                inspiration, trend_signals, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11)
               ON CONFLICT (id) DO NOTHING""",
            idea_id, idea.name, idea.tagline, idea.problem, idea.solution,
            idea.why_now, idea.market, idea.revenue,
            inspiration_json, trend_signals_json, created_at,
        )


@app.get("/api/ideas/history", response_model=IdeasHistoryResponse)
async def get_ideas_history(limit: int = 30) -> IdeasHistoryResponse:
    async with state.db.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, idea_name, tagline, problem, solution, why_now, market,
                      revenue, inspiration, trend_signals, github_url, created_at
               FROM generated_ideas
               ORDER BY created_at DESC
               LIMIT $1""",
            min(limit, 100),
        )
    ideas = []
    for r in rows:
        inspiration = json.loads(r["inspiration"]) if isinstance(r["inspiration"], str) else (r["inspiration"] or [])
        trend_signals_raw = json.loads(r["trend_signals"]) if isinstance(r["trend_signals"], str) else (r["trend_signals"] or [])
        trend_signals = [TrendItem(**t) for t in trend_signals_raw]
        ideas.append(IdeaRecord(
            id=str(r["id"]),
            idea_name=r["idea_name"],
            tagline=r["tagline"],
            problem=r["problem"],
            solution=r["solution"],
            why_now=r["why_now"],
            market=r["market"],
            revenue=r["revenue"],
            inspiration=inspiration,
            trend_signals=trend_signals,
            github_url=r["github_url"],
            created_at=r["created_at"].isoformat(),
        ))
    return IdeasHistoryResponse(ideas=ideas)
