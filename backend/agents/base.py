from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from typing import Any

import anthropic

logger = logging.getLogger(__name__)

ARTIFACT_KEYS = {
    "market_analyst":    ("market_analysis",    "Market Analysis"),
    "tech_architect":    ("tech_blueprint",      "Technical Blueprint"),
    "vc_partner":        ("vc_review",           "VC Partner Review"),
    "legal_advisor":     ("legal_assessment",    "Legal Assessment"),
    "product_manager":   ("product_spec",        "Product Specification"),
    "growth_strategist": ("gtm_strategy",        "Go-To-Market Strategy"),
    "cfo":               ("financial_model",     "Financial Model"),
    "founder":           ("founder_synthesis",   "Founder Synthesis"),
    "product_architect": ("product_blueprint",   "Product Blueprint"),
}


class Agent:
    """Single agent that streams a response given an idea + prior context."""

    def __init__(self, role: str, system_prompt: str, model: str, client: anthropic.AsyncAnthropic) -> None:
        self.role = role
        self.system_prompt = system_prompt
        self.model = model
        self.client = client
        self.artifact_key, self.artifact_title = ARTIFACT_KEYS[role]

    async def run(
        self,
        idea: str,
        context: dict[str, str],
        stream_queue: asyncio.Queue,
        session_id: str,
        phase: int,
    ) -> str:
        """
        Stream agent output to `stream_queue` and return the full text.
        Each queue item is a dict matching SSEEvent shape.
        """
        user_message = self._build_user_message(idea, context)

        await stream_queue.put({
            "type": "agent_start",
            "session_id": session_id,
            "phase": phase,
            "agent": self.role,
        })

        full_text = ""
        try:
            async with self.client.messages.stream(
                model=self.model,
                max_tokens=4096,
                system=self.system_prompt,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                async for chunk in stream.text_stream:
                    full_text += chunk
                    await stream_queue.put({
                        "type": "agent_chunk",
                        "session_id": session_id,
                        "phase": phase,
                        "agent": self.role,
                        "content": chunk,
                    })
        except Exception as exc:
            logger.exception("[%s] Streaming error: %s", self.role, exc)
            await stream_queue.put({
                "type": "error",
                "session_id": session_id,
                "phase": phase,
                "agent": self.role,
                "content": str(exc),
            })

        await stream_queue.put({
            "type": "agent_complete",
            "session_id": session_id,
            "phase": phase,
            "agent": self.role,
            "artifact_key": self.artifact_key,
        })

        return full_text

    def _build_user_message(self, idea: str, context: dict[str, str]) -> str:
        parts = [f"## Startup Idea\n{idea}\n"]

        if context:
            parts.append("## Prior Team Analysis\n")
            label_map = {v[0]: v[1] for v in ARTIFACT_KEYS.values()}
            for key, content in context.items():
                label = label_map.get(key, key)
                parts.append(f"### {label}\n{content}\n")

        parts.append(f"\nNow produce your {self.artifact_title}.")
        return "\n".join(parts)
