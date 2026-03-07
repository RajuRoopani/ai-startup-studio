from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

import anthropic
import asyncpg

from agents.base import Agent
from agents.prompts import (
    CFO,
    FOUNDER,
    GROWTH_STRATEGIST,
    LEGAL_ADVISOR,
    MARKET_ANALYST,
    PRODUCT_ARCHITECT,
    PRODUCT_MANAGER,
    TECH_ARCHITECT,
    VC_PARTNER,
)

logger = logging.getLogger(__name__)

# Model assignment — Opus for Founder + VC, Sonnet for the rest
SONNET = "claude-sonnet-4-6"
OPUS   = "claude-opus-4-6"

PHASE_STRUCTURE = [
    # Phase 1 — Research (parallel)
    {
        "phase": 1,
        "label": "Research",
        "parallel": True,
        "agents": [
            ("market_analyst",  MARKET_ANALYST,  SONNET),
            ("tech_architect",  TECH_ARCHITECT,  SONNET),
        ],
    },
    # Phase 2 — Stress Test (sequential — reads Phase 1)
    {
        "phase": 2,
        "label": "Stress Test",
        "parallel": False,
        "agents": [
            ("vc_partner",    VC_PARTNER,    OPUS),
            ("legal_advisor", LEGAL_ADVISOR, SONNET),
        ],
    },
    # Phase 3 — Build Plan (parallel — reads Phase 1+2)
    {
        "phase": 3,
        "label": "Build Plan",
        "parallel": True,
        "agents": [
            ("product_manager",   PRODUCT_MANAGER,   SONNET),
            ("growth_strategist", GROWTH_STRATEGIST, SONNET),
            ("cfo",               CFO,               SONNET),
        ],
    },
    # Phase 4 — Synthesis (sequential — reads everything)
    {
        "phase": 4,
        "label": "Synthesis",
        "parallel": False,
        "agents": [
            ("founder", FOUNDER, OPUS),
        ],
    },
    # Phase 5 — Product Blueprint (sequential — reads all 8 artifacts)
    {
        "phase": 5,
        "label": "Product Blueprint",
        "parallel": False,
        "agents": [
            ("product_architect", PRODUCT_ARCHITECT, SONNET, 16000),
        ],
    },
]


async def run_studio(
    session_id: str,
    idea: str,
    db: asyncpg.Pool,
    stream_queue: asyncio.Queue,
    anthropic_client: anthropic.AsyncAnthropic,
) -> None:
    """
    Run the full 5-phase studio session.
    Streams SSE events to stream_queue.
    Persists messages and artifacts to PostgreSQL.
    """
    context: dict[str, str] = {}  # artifact_key → full content

    try:
        for phase_def in PHASE_STRUCTURE:
            phase_num = phase_def["phase"]
            phase_label = phase_def["label"]
            is_parallel = phase_def["parallel"]

            await stream_queue.put({
                "type": "phase_start",
                "session_id": session_id,
                "phase": phase_num,
                "content": phase_label,
            })
            logger.info("[%s] Phase %d: %s", session_id[:8], phase_num, phase_label)

            agents = [
                Agent(role, prompt, model, anthropic_client, max_tokens)
                for role, prompt, model, *rest in phase_def["agents"]
                for max_tokens in [rest[0] if rest else 4096]
            ]

            if is_parallel:
                results = await asyncio.gather(*[
                    agent.run(idea, context, stream_queue, session_id, phase_num)
                    for agent in agents
                ])
                for agent, (result_text, in_tok, out_tok, cost) in zip(agents, results):
                    context[agent.artifact_key] = result_text
                    await _save_artifact(db, session_id, agent, result_text, phase_num, in_tok, out_tok, cost)
            else:
                for agent in agents:
                    result_text, in_tok, out_tok, cost = await agent.run(idea, context, stream_queue, session_id, phase_num)
                    context[agent.artifact_key] = result_text
                    await _save_artifact(db, session_id, agent, result_text, phase_num, in_tok, out_tok, cost)

            await stream_queue.put({
                "type": "phase_complete",
                "session_id": session_id,
                "phase": phase_num,
                "content": phase_label,
            })

        # Mark session complete
        async with db.acquire() as conn:
            await conn.execute(
                "UPDATE sessions SET status='complete', completed_at=NOW() WHERE id=$1",
                session_id,
            )

        await stream_queue.put({
            "type": "session_complete",
            "session_id": session_id,
            "phase": 5,
        })
        logger.info("[%s] Studio session complete.", session_id[:8])

    except Exception as exc:
        logger.exception("[%s] Studio error: %s", session_id[:8], exc)
        async with db.acquire() as conn:
            await conn.execute(
                "UPDATE sessions SET status='failed' WHERE id=$1",
                session_id,
            )
        await stream_queue.put({
            "type": "error",
            "session_id": session_id,
            "phase": 0,
            "content": f"Studio session failed: {exc}",
        })


async def _save_artifact(
    db: asyncpg.Pool,
    session_id: str,
    agent: Agent,
    content: str,
    phase: int,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cost_usd: float = 0.0,
) -> None:
    async with db.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO artifacts (session_id, artifact_key, title, content)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (session_id, artifact_key) DO UPDATE SET content=EXCLUDED.content
            """,
            session_id, agent.artifact_key, agent.artifact_title, content,
        )
        await conn.execute(
            """
            INSERT INTO agent_messages (session_id, agent_role, phase, content, input_tokens, output_tokens, cost_usd)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            session_id, agent.role, phase, content, input_tokens, output_tokens, cost_usd,
        )
