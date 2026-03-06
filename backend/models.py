from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


# ─────────────────────────────────────────────
# Request / Response schemas
# ─────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    idea: str


class SessionResponse(BaseModel):
    session_id: str
    share_slug: str
    status: str


class ArtifactOut(BaseModel):
    key: str
    title: str
    content: str
    created_at: str


class AgentMessageOut(BaseModel):
    id: int
    agent_role: str
    phase: int
    content: str
    created_at: str


class SessionDetail(BaseModel):
    id: str
    idea: str
    status: str
    share_slug: str
    created_at: str
    completed_at: Optional[str]
    artifacts: List[ArtifactOut]
    messages: List[AgentMessageOut]


# ─────────────────────────────────────────────
# SSE event shapes
# ─────────────────────────────────────────────

SSEEventType = Literal[
    "phase_start",
    "agent_start",
    "agent_chunk",
    "agent_complete",
    "phase_complete",
    "session_complete",
    "error",
]


class SSEEvent(BaseModel):
    type: SSEEventType
    session_id: str
    phase: Optional[int] = None
    agent: Optional[str] = None
    content: Optional[str] = None
    artifact_key: Optional[str] = None


# ─────────────────────────────────────────────
# Internal agent result
# ─────────────────────────────────────────────

class AgentResult(BaseModel):
    agent_role: str
    artifact_key: str
    artifact_title: str
    content: str          # full streamed text


# ─────────────────────────────────────────────
# Idea Radar — trends + spark ideas
# ─────────────────────────────────────────────

class TrendItem(BaseModel):
    id: str
    source: Literal["github", "hn", "arxiv"]
    title: str
    description: str
    url: str
    signal: str
    tags: List[str]


class TrendsResponse(BaseModel):
    trends: List[TrendItem]


class SparkIdeasRequest(BaseModel):
    trends: List[TrendItem]


class SparkIdea(BaseModel):
    name: str
    tagline: str
    problem: str
    solution: str
    why_now: str
    market: str
    revenue: str
    inspiration: List[str]


class SparkIdeasResponse(BaseModel):
    ideas: List[SparkIdea]
