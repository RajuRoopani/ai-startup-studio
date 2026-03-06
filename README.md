<div align="center">

# 🚀 AI Startup Studio

**Two tools in one: scan the latest tech trends to generate $1B startup ideas, then run them through 8 AI specialists for a complete investor-ready package.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude%20Opus%204.6-orange)](https://anthropic.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black)](https://nextjs.org)

![AI Startup Studio Landing Page](screenshots/landing.png)

</div>

---

## What Is This?

Most founders spend weeks gathering feedback from advisors, consultants, and investors — only to hear the same hard questions they should have asked themselves on day one.

**AI Startup Studio** gives you two superpowers:

1. **🔭 Idea Radar** — Scan live trend signals from GitHub, Hacker News, arXiv, and Papers With Code. Select the signals that excite you. Let Claude Opus synthesise them into startup ideas with problem, solution, market size, and revenue model. Each idea is auto-saved to your database and pushed to GitHub as a rich Markdown file.

2. **🏗️ The Studio** — Submit any idea (yours or one from the Radar) and watch 8 AI specialists — Market Analyst, VC Partner, CFO, Legal Advisor, and more — debate it live and produce a complete investor-ready package in ~15 minutes.

---

## ✦ Feature 1: Idea Radar

> *"I don't know what to build — help me find what the market needs right now."*

The Idea Radar scans four live sources every time you open it:

| Source | What it fetches | Why it matters |
|--------|----------------|----------------|
| ⚡ **GitHub** | Repos with 50+ stars created in the last 30 days | What are developers actually building right now? |
| ▲ **Hacker News** | Current top stories by score | What's capturing the tech world's attention? |
| 📄 **arXiv** | Latest papers in cs.AI + cs.LG + cs.CL | Cutting-edge research that can be productised |
| 📄 **Papers With Code** | ML papers ranked by GitHub stars | Research with proven developer interest |

### How to use it

1. Open `/ideas` (linked from nav as **🔭 Idea Radar**)
2. Browse cards across all 4 sources. Filter by source tab.
3. Select 3-10 signals that interest you (click to toggle)
4. Hit **✦ Spark Ideas** — Claude Opus analyses them and generates 5 startup ideas
5. Each idea card shows: problem, solution, why now, market size, revenue model
6. Click **Launch Studio →** on any idea to run the full 8-agent analysis
7. All generated ideas are:
   - Saved to PostgreSQL (`generated_ideas` table)
   - Pushed to your GitHub repo as `generated-ideas/YYYY-MM-DD-{name}.md`
   - Browsable in the **📚 History** tab anytime

### Generated idea format (GitHub Markdown)

Every idea is saved as a rich Markdown file:

```markdown
# 🚀 YourIdeaName

> The tagline in one sentence

## 💡 The Problem
## ⚡ The Solution
## ⏰ Why Now
## 📊 Market
## 💰 Revenue Model

## 🔗 Inspired By
- [Paper / Repo / Story Title]

## 📡 Source Trend Signals
| Title | Source | Signal |
|-------|--------|--------|
| ... | arXiv | 📄 arXiv preprint |
```

---

## 🏗️ Feature 2: The Studio

> *"I have an idea — now tear it apart and give me everything I need to pitch it."*

Eight AI specialists, each with a distinct agenda:

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

Each phase builds on the last. The VC Partner reads Phase 1 before firing questions. The Founder reads *everything* before writing the synthesis.

### What you get (8 artifacts)

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

All artifacts rendered as rich Markdown, copyable, downloadable as a `.md` package, and shareable via public link (`/s/{slug}`).

---

## Architecture

```
User → Next.js (3000)
           ↓ POST /api/sessions            ↓ GET /api/trends + POST /api/spark-ideas
       FastAPI (8000)
           ├── asyncio background task → Agent Orchestrator
           │       ├── Phase 1: asyncio.gather() → parallel agents
           │       ├── Phase 2–4: sequential with growing context
           │       └── SSE stream → frontend live view
           ├── GET /api/trends → GitHub + HN + arXiv + Papers With Code (parallel)
           ├── POST /api/spark-ideas → Claude Opus → 5 ideas → DB + GitHub push
           └── GET /api/ideas/history → browse all generated ideas
           ↓
       PostgreSQL
           ├── sessions, agent_messages, artifacts
           └── generated_ideas (+ github_url when pushed)
           ↓
       GitHub API (optional)
           └── generated-ideas/*.md  ← rich markdown, auto-pushed
```

**No Redis. No message queues. No containers per agent.** Each studio agent is an async function streaming to a queue. FastAPI fans events to all SSE subscribers.

---

## Quick Start

**One command:**
```bash
git clone https://github.com/RajuRoopani/ai-startup-studio
cd ai-startup-studio
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
# Optional: add GITHUB_TOKEN to auto-push ideas to your repo
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
| `GITHUB_TOKEN` | — | — | Push generated ideas to GitHub as Markdown files |
| `GITHUB_REPO` | — | `RajuRoopani/ai-startup-studio` | Repo to push ideas to (`owner/repo`) |
| `ALLOWED_ORIGINS` | — | `*` | CORS allowed origins (comma-separated) |
| `LOG_LEVEL` | — | `INFO` | Backend log verbosity |

**GitHub push:** Set `GITHUB_TOKEN` and `GITHUB_REPO` to automatically push each generated idea as a rich Markdown file to `generated-ideas/` in your repo. Without the token, ideas are still saved to PostgreSQL.

---

## Pages

| URL | What it does |
|-----|-------------|
| `/` | Landing page — submit any idea to run the studio |
| `/ideas` | 🔭 Idea Radar — scan trends, spark ideas, browse history |
| `/studio/{id}` | Live studio view — watch 8 agents work in real time |
| `/output/{id}` | Artifact viewer — all 8 outputs with copy/download/share |
| `/s/{slug}` | Public share link for any completed analysis |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI** | Anthropic Claude (Opus 4.6 + Sonnet 4.6) |
| **Backend** | Python 3.11 · FastAPI · asyncpg · httpx · SSE |
| **Frontend** | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| **Database** | PostgreSQL 16 |
| **External APIs** | GitHub REST · Hacker News Firebase · arXiv · Papers With Code |
| **Infra** | Docker Compose |

---

## Project Structure

```
ai-startup-studio/
├── backend/
│   ├── agents/
│   │   ├── base.py            # Streaming agent class
│   │   ├── orchestrator.py    # 4-phase coordination
│   │   └── prompts.py         # All 8 system prompts
│   ├── main.py                # FastAPI app + trends + spark-ideas + SSE
│   ├── models.py              # Pydantic schemas
│   └── db.py                  # asyncpg pool
├── frontend/
│   ├── app/
│   │   ├── page.tsx                     # Landing page
│   │   ├── ideas/page.tsx               # 🔭 Idea Radar + 📚 History
│   │   ├── studio/[id]/page.tsx         # Live studio view
│   │   ├── output/[id]/OutputClient.tsx # Artifact viewer
│   │   └── s/[slug]/page.tsx            # Public share page
│   ├── components/
│   │   ├── AgentCard.tsx      # Agent status card
│   │   ├── PhaseTracker.tsx   # 4-phase progress tracker
│   │   └── Toast.tsx          # Notification component
│   └── lib/api.ts             # API client (sessions, trends, ideas, SSE)
├── generated-ideas/           # Auto-pushed idea Markdown files (via GitHub API)
├── shared/
│   └── schema.sql             # PostgreSQL schema
└── docker-compose.yml
```

---

## Roadmap

- [x] 🔭 Idea Radar — scan GitHub, HN, arXiv, Papers With Code
- [x] ✦ Spark Ideas — Claude Opus generates ideas from selected signals
- [x] 📚 History — browse all past ideas, saved to DB + GitHub
- [x] 🔗 Share links — public `/s/{slug}` URL for every output
- [ ] PDF pitch deck export (Puppeteer renders output → PDF)
- [ ] Auth + personal session history (Clerk)
- [ ] Public gallery of past analyses (viral sharing loop)
- [ ] Follow-up Q&A mode (ask the team follow-up questions)
- [ ] Side-by-side idea comparison

---

## Contributing

PRs welcome. The best contributions:
- Additional trend sources (Product Hunt, Reddit, Semantic Scholar)
- Sharper agent prompts (make the VC harder, the CFO more precise)
- PDF export
- Better streaming UI animations

---

## License

MIT — use it, fork it, build on it.

---

<div align="center">

Built with ❤️ and [Claude](https://anthropic.com) · [View Pitch Deck](PITCH.md) · [Generated Ideas](generated-ideas/)

</div>
