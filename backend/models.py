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
