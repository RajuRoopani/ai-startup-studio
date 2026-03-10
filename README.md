<div align="center">

# 🚀 AI Startup Studio

**From zero to investor-ready in minutes. Scan live tech trends across 6 sources, generate startup ideas, then run them through 8 AI specialists for a complete analysis package.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude%20Opus%204.6-orange)](https://anthropic.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black)](https://nextjs.org)
[![Rate Limited](https://img.shields.io/badge/Rate%20Limited-slowapi-blue)](https://github.com/laurents/slowapi)

![AI Startup Studio Landing Page](screenshots/landing.png)

</div>

---

## Demo

https://github.com/user-attachments/assets/studio-demo.mp4

> **71-second investor walkthrough** — live trend ingestion from arXiv research papers → AI idea spark → 8-specialist studio analysis → investor-ready artifacts

---

## What Is This?

Most founders spend weeks gathering feedback from advisors, consultants, and investors — only to hear the same hard questions they should have asked themselves on day one.

**AI Startup Studio** removes that gap. Two tools in one:

| Tool | What it does |
|------|-------------|
| **🔭 Idea Radar** | Scans 6 live sources — GitHub, Hacker News, arXiv, HuggingFace, Reddit, and Semantic Scholar. You select the signals that excite you, optionally type a direction, and Claude Opus generates 5 concrete startup ideas. Every idea is auto-saved to DB and pushed to GitHub as rich Markdown. |
| **🏗️ The Studio** | Submit any idea. Watch 8 AI specialists — Market Analyst, VC Partner, CFO, Legal Advisor, and more — debate it live through a 4-phase pipeline and produce 8 investor-ready artifacts in ~15 minutes. |

---

## ✦ Idea Radar  `/ideas`

![Idea Radar](screenshots/idea-radar.png)

> *"I don't know what to build. What does the market actually need right now?"*

### Six live signal sources

| Source | What it fetches | Signal value |
|--------|----------------|--------------|
| ⚡ **GitHub** | Repos with 50+ stars created in the last 30 days | What are developers shipping right now? |
| ▲ **Hacker News** | Current top stories by score + comments | What's capturing tech attention? |
| 📄 **arXiv** | Latest papers in cs.AI · cs.LG · cs.CL | Cutting-edge research ready to be productised |
| 🤗 **HuggingFace Daily Papers** | Community-curated AI papers ranked by upvotes + comments | Research the ML community is actually excited about |
| 🔴 **Reddit** | Top posts from r/MachineLearning + r/LocalLLaMA | Practitioner-level AI discussions and pain points |
| 📚 **Semantic Scholar** | Highest-cited recent AI papers | Academic research with real-world impact |

> **~45 signals per load** · refreshed every 5 minutes (server-side cache)

### Add any paper or repo by URL

Paste any link into the URL bar — no matter how obscure:

```
https://arxiv.org/pdf/2603.05240v1        → fetches by arXiv ID (any category, any date)
https://github.com/owner/repo             → fetches repo stats + topics
https://news.ycombinator.com/item?id=...  → fetches HN story
```

### Direction input

Type a founder direction before hitting Spark Ideas to constrain the output:

> *"Focus on B2B developer tools"* · *"I want to build in healthcare AI"* · *"Solo founder, no fundraising"*

Claude Opus treats this as the primary constraint and generates all 5 ideas within that frame.

### Generating ideas

![Idea Radar Selected](screenshots/idea-radar-selected.png)

1. Select 3–10 signals (click any card to toggle)
2. Optionally type a founder direction
3. Hit **✦ Spark Ideas** — Claude Opus analyses them and returns 5 startup ideas
4. Each idea card shows: name, tagline, problem, solution, and (expandable) why-now, market, revenue, inspiration credits
5. **Launch Studio →** sends it straight to the 8-agent analysis

### Persistence

Every generated idea is automatically:
- Saved to the `generated_ideas` PostgreSQL table
- Pushed to your GitHub repo as `generated-ideas/YYYY-MM-DD-{name}.md` (requires `GITHUB_TOKEN`)
- Browsable in the **📚 History** tab on the same page

---

## 🏗️ The Studio  `/`

> *"I have an idea. Tear it apart."*

Submit any idea and watch 8 AI specialists work through it in four phases.

### The agents

| Agent | Model | Agenda |
|-------|-------|--------|
| 📊 **Market Analyst** | Sonnet 4.6 | TAM/SAM/SOM, competitive landscape, market timing |
| 🏗️ **Tech Architect** | Sonnet 4.6 | Stack, feasibility, build-vs-buy, infra cost at scale |
| 💰 **VC Partner** | **Opus 4.6** | Devil's advocate — fires the questions that kill companies |
| ⚖️ **Legal Advisor** | Sonnet 4.6 | IP, regulatory risk, data compliance, 90-day checklist |
| 🎯 **Product Manager** | Sonnet 4.6 | MVP feature set (MoSCoW), user persona, journey, KPIs |
| 🚀 **Growth Strategist** | Sonnet 4.6 | GTM motion, first 100 users, viral loops, channels |
| 📈 **CFO** | Sonnet 4.6 | Revenue model, unit economics, 3-year projections |
| 💡 **Founder** | **Opus 4.6** | Synthesises everything into the pitch narrative |

### The 4-phase pipeline

```
Phase 1 — RESEARCH (parallel, ~2 min)
  ├── Market Analyst  → TAM, competition, timing
  └── Tech Architect  → stack, feasibility, cost

Phase 2 — STRESS TEST (sequential, ~3 min)
  ├── VC Partner      → fatal flaws, hard questions
  └── Legal Advisor   → risks, compliance checklist

Phase 3 — BUILD PLAN (parallel, ~4 min)
  ├── Product Manager   → MVP spec, user journey
  ├── Growth Strategist → GTM, first 100 users
  └── CFO               → financials, projections

Phase 4 — SYNTHESIS (sequential, ~2 min)
  └── Founder         → executive summary, pitch narrative
```

Each phase builds on the last. The VC Partner reads Phase 1 before firing questions. The Founder reads *everything*.

### 8 output artifacts

| Artifact | Contents |
|----------|---------|
| 📋 Executive Summary | 3-paragraph pitch narrative + investment thesis |
| 📊 Market Analysis | TAM/SAM/SOM, 5 named competitors, timing thesis |
| 🎯 MVP Specification | MoSCoW features, user persona, journey, build timeline |
| 🚀 GTM Strategy | First 100 users playbook, viral loop design |
| 📈 Financial Model | Unit economics, 3-year P&L projections |
| 🏗️ Tech Blueprint | Stack diagram, build-vs-buy, infra cost at 3 scale points |
| ⚖️ Legal Assessment | Regulatory risks, IP strategy, 90-day checklist |
| 💰 VC Review | Fatal flaws, defensibility analysis, fundability verdict |

All rendered as rich Markdown. Copyable per-artifact. Shareable via public link (`/s/{slug}`).

---

## 📋 History  `/history`

Every studio session you've ever run — complete reports, live sessions, and failed runs.

- **Status badges**: ✓ Complete · ⟳ Running (with live pulse bar) · ✗ Failed
- **View Report →** for complete sessions, **Watch Live →** for in-progress
- **Share** button copies the public `/s/{slug}` URL to clipboard
- Filter tabs: All · Complete · In Progress · Failed

---

## Architecture

```
User → Next.js (:3000)
          │
          ├── POST /api/sessions       → Studio run (5/min rate limit)
          ├── GET  /api/sessions       → History list
          ├── GET  /api/trends         → 6 sources, 5-min server cache (30/min limit)
          ├── POST /api/trends/resolve → Fetch any arXiv/GitHub/HN URL (20/min limit)
          ├── POST /api/spark-ideas    → Claude Opus → 5 ideas (3/min rate limit)
          └── GET  /api/ideas/history  → All generated ideas
          │
       FastAPI (:8000)
          ├── Rate limiting (slowapi — per-IP)
          ├── Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
          ├── Request ID tracing (X-Request-ID on every response)
          ├── Agent Orchestrator (asyncio — 4-phase pipeline)
          ├── SSE fan-out → frontend live view
          └── PostgreSQL (asyncpg pool min=2, max=10)
                ├── sessions · agent_messages · artifacts
                └── generated_ideas (+ github_url)
                      │
                   GitHub API (optional)
                      └── generated-ideas/*.md
```

**No Redis. No message queues. No containers per agent. One `docker compose up` and it runs anywhere.**

---

## Quick Start

```bash
git clone https://github.com/RajuRoopani/ai-startup-studio
cd ai-startup-studio
cp .env.example .env
# Set ANTHROPIC_API_KEY — required
# Set GITHUB_TOKEN + GITHUB_REPO — optional, enables idea push to GitHub
docker compose up --build
open http://localhost:3000
```

---

## Local Development

```bash
# 1. Postgres
docker compose up -d postgres

# 2. Backend
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql://studio:studio@localhost:5432/startup_studio \
ANTHROPIC_API_KEY=sk-ant-... \
uvicorn main:app --reload --port 8000

# 3. Frontend
cd frontend && npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | — | Anthropic API key |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `GITHUB_TOKEN` | — | — | Push generated ideas as Markdown + higher GitHub API rate limits |
| `GITHUB_REPO` | — | `RajuRoopani/ai-startup-studio` | Repo to push ideas to (`owner/repo`) |
| `ALLOWED_ORIGINS` | — | `*` | CORS — set to your domain in production |
| `NEXT_PUBLIC_SITE_URL` | — | `https://ai-startup-studio.com` | Canonical URL for OG meta tags |
| `LOG_LEVEL` | — | `INFO` | Backend log verbosity |

---

## Production Features

| Feature | Implementation |
|---------|---------------|
| **Rate limiting** | `slowapi` per-IP: 5/min on `/api/sessions`, 3/min on `/api/spark-ideas`, 30/min on `/api/trends` |
| **Trends caching** | In-memory 5-min TTL — `/api/trends` hits 6 external APIs at most once per 5 min |
| **Security headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` on every response |
| **Request ID tracing** | `X-Request-ID` header on every response (pass-through or auto-generated UUID) |
| **Response timing** | `X-Response-Time` header on every response |
| **Health check** | `GET /health` — verifies DB connectivity, returns `503` if DB is unreachable |
| **OG / Twitter cards** | Dynamic `opengraph-image.tsx` (Next.js Edge ImageResponse) — auto-served at `/opengraph-image.png` |
| **SEO** | Full metadata in `layout.tsx` — title template, description, keywords, robots, canonical, twitter card |
| **Security headers (frontend)** | `next.config.mjs` injects security headers on every page response |
| **DB health in CI** | Health endpoint pings PostgreSQL — suitable for Docker/K8s readiness probe |

---

## Pages

| URL | Purpose |
|-----|---------|
| `/` | Submit any idea to run the full studio |
| `/ideas` | 🔭 Idea Radar — scan 6 sources, add by URL, spark ideas, browse history |
| `/history` | 📋 All studio sessions — view, share, filter by status |
| `/studio/{id}` | Live studio view — watch 8 agents work in real time |
| `/output/{id}` | Artifact viewer — all 8 outputs, copy/share |
| `/s/{slug}` | Public share link for any completed analysis |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI** | Claude Opus 4.6 (VC Partner, Founder, Spark Ideas) · Sonnet 4.6 (all other agents) |
| **Backend** | Python 3.11 · FastAPI · asyncpg · httpx · SSE · slowapi |
| **Frontend** | Next.js 14 App Router · TypeScript · Tailwind CSS · React Markdown |
| **Database** | PostgreSQL 16 |
| **External APIs** | GitHub REST · HN Firebase · arXiv Atom · HuggingFace Daily Papers · Reddit JSON · Semantic Scholar |
| **Infra** | Docker Compose — single `docker compose up` |

**Cost per Studio run:** ~$0.30–0.80 at Anthropic list pricing (Opus for VC + Founder; Sonnet for the rest)
**Cost per Idea Radar run:** ~$0.10–0.20 (Claude Opus generates 5 ideas from selected signals)

---

## Project Structure

```
ai-startup-studio/
├── backend/
│   ├── agents/
│   │   ├── base.py            # Streaming agent class
│   │   ├── orchestrator.py    # 4-phase pipeline coordinator
│   │   └── prompts.py         # All 8 system prompts
│   ├── main.py                # FastAPI — all endpoints + rate limiting + caching
│   ├── models.py              # Pydantic schemas
│   └── db.py                  # asyncpg pool
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Landing page
│   │   ├── layout.tsx             # Root layout — SEO, OG, Twitter card meta
│   │   ├── opengraph-image.tsx    # Dynamic OG image (Next.js Edge)
│   │   ├── ideas/                 # 🔭 Idea Radar + 📚 Idea History
│   │   ├── history/               # 📋 Studio session history
│   │   ├── studio/[id]/           # Live studio view (SSE)
│   │   ├── output/[id]/           # Artifact viewer
│   │   └── s/[slug]/              # Public share page
│   ├── components/
│   │   ├── AgentCard.tsx          # Agent status (idle/thinking/done)
│   │   ├── PhaseTracker.tsx       # 4-phase progress bar
│   │   └── Toast.tsx              # Notification system
│   ├── lib/api.ts                 # All API calls
│   ├── public/
│   │   ├── icon.svg               # SVG favicon
│   │   └── robots.txt             # Search engine crawl rules
│   └── next.config.mjs            # Rewrites + security headers
├── generated-ideas/           # Auto-pushed idea Markdown (GitHub API)
├── shared/schema.sql          # PostgreSQL schema
└── docker-compose.yml
```

---

## Roadmap

- [x] 🔭 Idea Radar — scan GitHub, HN, arXiv, HuggingFace Daily Papers
- [x] 🔴 Reddit source — r/MachineLearning + r/LocalLLaMA top posts
- [x] 📚 Semantic Scholar source — highest-cited AI papers
- [x] 🔗 Add by URL — paste any arXiv/GitHub/HN link as a signal
- [x] ✦ Spark Ideas — Claude Opus generates ideas from selected signals
- [x] 🎯 Direction input — guide Claude's focus before generating
- [x] 💾 Persistent ideas — saved to DB + auto-pushed to GitHub as Markdown
- [x] 📚 Idea History — browse all past generated ideas with GitHub links
- [x] 📋 Session History — all studio sessions with status, filter, share
- [x] 🔗 Public share links — `/s/{slug}` for every completed analysis
- [x] 🛡️ Rate limiting — per-IP limits on all expensive endpoints
- [x] ⚡ Trends caching — 5-min server-side cache, no redundant external API calls
- [x] 🔒 Security headers — X-Frame-Options, CSP, Referrer-Policy on all responses
- [x] 🖼️ OG image — dynamic social preview card via Next.js Edge ImageResponse
- [ ] PDF pitch deck export (Puppeteer → PDF)
- [ ] Auth + personal workspaces (Clerk)
- [ ] Public gallery (viral sharing loop)
- [ ] Follow-up Q&A with the team
- [ ] Side-by-side idea comparison
- [ ] Patent search integration (USPTO / Google Patents)

---

## Contributing

PRs welcome. High-value contributions:
- Sharper agent prompts (make the VC harder, the CFO more precise)
- PDF export
- Patent database integration
- Auth / workspaces
- More signal sources (Product Hunt, dev.to, LinkedIn trending)

---

## License

MIT — use it, fork it, build on it.

---

<div align="center">

Built with ❤️ and [Claude](https://anthropic.com) · [Pitch Deck](PITCH.md) · [Generated Ideas](generated-ideas/)

</div>
