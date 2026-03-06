<div align="center">

# 🚀 AI Startup Studio

**8 AI specialists tear apart your startup idea and produce a complete investor-ready package — in real time.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude%20Sonnet%204.6-orange)](https://anthropic.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black)](https://nextjs.org)

![AI Startup Studio Landing Page](screenshots/landing.png)

</div>

---

## What Is This?

Most founders spend weeks gathering feedback from advisors, consultants, and investors — only to hear the same hard questions they should have asked themselves on day one.

**AI Startup Studio** puts a full advisory team in your browser. Type one sentence. Watch 8 AI specialists — each with a distinct role, perspective, and agenda — debate your idea live. Walk away with a complete startup package: market analysis, MVP spec, financial model, legal assessment, GTM strategy, tech blueprint, VC stress-test, and a founder synthesis ready for investors.

**The magic is the deliberation.** You don't just get answers — you watch the Market Analyst disagree with the VC Partner, the Legal Advisor flag something everyone missed, and the Founder synthesise it all into a compelling narrative. It's the startup war room you never had access to.

---

## Demo

![Studio Live View](screenshots/studio-view.png)

> *The studio view: 4-phase pipeline tracker, 8 agent cards lighting up as they work, streaming analysis in real time.*

---

## The Team

Eight specialists, each with a distinct agenda:

| Agent | Model | What They Do |
|---|---|---|
| 📊 **Market Analyst** | Sonnet | TAM/SAM/SOM sizing, competitive landscape, market timing thesis |
| 🏗️ **Tech Architect** | Sonnet | Stack recommendation, feasibility, build-vs-buy, infra cost at scale |
| 💰 **VC Partner** | Opus | Plays devil's advocate — asks the questions that kill companies |
| ⚖️ **Legal Advisor** | Sonnet | IP, regulatory risk, data compliance, 90-day legal checklist |
| 🎯 **Product Manager** | Sonnet | MVP feature set (MoSCoW), user persona, journey, success KPIs |
| 🚀 **Growth Strategist** | Sonnet | GTM motion, first 100 users, viral loops, acquisition channels |
| 📈 **CFO** | Sonnet | Revenue model, unit economics, 3-year projections, funding needs |
| 💡 **Founder** | Opus | Synthesises everything into the pitch narrative, addresses VC objections |

The **VC Partner** and **Founder** run on Claude Opus — the harshest critic and the visionary storyteller both deserve the most capable model.

---

## How It Works

### The 4-Phase Pipeline

```
Phase 1 — RESEARCH (parallel, ~2 min)
  ├── Market Analyst    → TAM, competition, timing
  └── Tech Architect    → stack, feasibility, cost

Phase 2 — STRESS TEST (sequential, ~3 min)
  ├── VC Partner        → fatal flaws, hard questions
  └── Legal Advisor     → risks, compliance checklist

Phase 3 — BUILD PLAN (parallel, ~4 min)
  ├── Product Manager   → MVP spec, user journey
  ├── Growth Strategist → GTM, first 100 users
  └── CFO               → financials, projections

Phase 4 — SYNTHESIS (sequential, ~2 min)
  └── Founder           → executive summary, pitch narrative
```

Each phase builds on the last. The VC Partner reads Phase 1 before firing questions. The Founder reads *everything* before writing the synthesis. This layered context is what produces advisor-quality output instead of generic AI boilerplate.

### Architecture

```
User → Next.js (3000)
           ↓ POST /api/sessions
       FastAPI (8000)
           ↓ asyncio background task
       Agent Orchestrator
           ├── Phase 1: asyncio.gather() → parallel agents
           ├── Phase 2–4: sequential agents with growing context
           └── SSE stream → frontend live view
           ↓
       PostgreSQL
           └── sessions, agent_messages, artifacts
```

**No Redis. No message queues. No containers per agent.** Each agent is an async function streaming to a queue. FastAPI fans the queue out to every SSE subscriber. Simple, fast, easy to self-host.

---

## What You Get

Every run produces **8 downloadable artifacts**:

| # | Artifact | Contents |
|---|---|---|
| 1 | **Executive Summary** | 3-paragraph pitch narrative + investment thesis |
| 2 | **Market Analysis** | TAM/SAM/SOM with reasoning, 5 competitors, timing thesis |
| 3 | **MVP Specification** | MoSCoW feature list, user persona, journey, build timeline |
| 4 | **GTM Strategy** | First 100 users playbook, acquisition channels, viral loop design |
| 5 | **Financial Model** | Revenue model, unit economics, 3-year P&L projections |
| 6 | **Tech Blueprint** | Stack diagram, build-vs-buy decisions, infra cost at 3 scale points |
| 7 | **Legal Assessment** | Regulatory risks, IP strategy, incorporation recommendation, 90-day checklist |
| 8 | **VC Review** | Fatal flaws, defensibility analysis, fundability verdict |

All artifacts rendered as rich Markdown, copyable, and downloadable as a single `.md` package. Share via public link.

---

## Quick Start

**One command:**
```bash
git clone https://github.com/RajuRoopani/ai-startup-studio
cd ai-startup-studio
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
docker compose up --build
open http://localhost:3000
```

**Requirements:** Docker + an Anthropic API key.

---

## Local Development (without Docker)

```bash
# 1. Start Postgres
docker compose up -d postgres

# 2. Backend
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql://studio:studio@localhost:5432/startup_studio \
ANTHROPIC_API_KEY=sk-ant-... \
uvicorn main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | — | Your Anthropic API key |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `GITHUB_TOKEN` | — | — | Alternative: use GitHub Copilot as backend |
| `ALLOWED_ORIGINS` | — | `*` | CORS allowed origins (comma-separated) |
| `LOG_LEVEL` | — | `INFO` | Backend log verbosity |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI** | Anthropic Claude (Opus 4.6 + Sonnet 4.6) |
| **Backend** | Python 3.11 · FastAPI · asyncpg · SSE |
| **Frontend** | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| **Database** | PostgreSQL 16 |
| **Infra** | Docker Compose |

---

## Project Structure

```
ai-startup-studio/
├── backend/
│   ├── agents/
│   │   ├── base.py          # Streaming agent class
│   │   ├── orchestrator.py  # 4-phase coordination
│   │   └── prompts.py       # All 8 system prompts
│   ├── main.py              # FastAPI app + SSE
│   ├── models.py            # Pydantic schemas
│   └── db.py                # asyncpg pool
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── studio/[id]/page.tsx        # Live studio view
│   │   └── output/[id]/OutputClient.tsx # Artifacts viewer
│   ├── components/
│   │   ├── AgentCard.tsx    # Agent status card
│   │   ├── PhaseTracker.tsx # 4-phase progress bar
│   │   └── ArtifactViewer.tsx # Markdown renderer
│   └── lib/api.ts           # API client + SSE
├── shared/
│   └── schema.sql           # PostgreSQL schema
└── docker-compose.yml
```

---

## Roadmap

- [ ] PDF pitch deck export (render output page → PDF via Puppeteer)
- [ ] Auth + session history (Clerk)
- [ ] Public gallery of past analyses (viral sharing loop)
- [ ] More agent roles: UX Researcher, Security Reviewer, Customer Dev
- [ ] Follow-up Q&A mode (ask the team follow-up questions)
- [ ] Side-by-side comparison of two ideas

---

## Contributing

PRs welcome. The best contributions:
- Sharper agent prompts (make the VC harder, the CFO more precise)
- New agent roles
- Better streaming UI animations
- PDF export

---

## License

MIT — use it, fork it, build on it.

---

<div align="center">

Built with ❤️ and [Claude](https://anthropic.com) · [View Pitch Deck](PITCH.md)

</div>
