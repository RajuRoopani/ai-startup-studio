# AI Startup Studio

8 AI specialists tear apart your startup idea and produce a complete investor-ready package in minutes.

**Live deliberation → real output.**

---

## What It Does

You type one sentence. A team of AI specialists debate it in real time:

| Agent | Role |
|---|---|
| 📊 Market Analyst | TAM/SAM/SOM, competition, timing |
| 🏗️ Tech Architect | Stack, feasibility, infra cost |
| 💰 VC Partner | Stress-tests every assumption |
| ⚖️ Legal Advisor | IP, regulatory, compliance |
| 🎯 Product Manager | MVP spec + user journey |
| 🚀 Growth Strategist | GTM + first 100 users |
| 📈 CFO | Unit economics + 3-yr projections |
| 💡 Founder | Synthesises everything into a pitch |

You watch them work in real time. At the end you get a complete startup package — downloadable as Markdown, shareable via link.

---

## Quick Start

```bash
# 1. Clone and enter directory
git clone <repo>
cd ai-startup-studio

# 2. Configure
cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY or GITHUB_TOKEN

# 3. Run
docker compose up --build

# 4. Open
open http://localhost:3000
```

---

## Development (without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql://studio:studio@localhost:5432/startup_studio \
ANTHROPIC_API_KEY=sk-ant-... \
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## Architecture

```
User → Next.js (3000) → FastAPI (8000) → PostgreSQL
                              ↓
                    Background task per session
                              ↓
                    Phase 1: Market Analyst + Tech Architect (parallel)
                    Phase 2: VC Partner → Legal Advisor (sequential)
                    Phase 3: PM + Growth + CFO (parallel)
                    Phase 4: Founder (synthesises all)
                              ↓
                    SSE stream → frontend live view
                              ↓
                    Artifacts stored → output page
```

**No Redis.** Agents run as asyncio tasks inside FastAPI. Real-time via SSE.

---

## Self-Hosting

The stack is intentionally minimal — just Postgres + FastAPI + Next.js.
One `docker compose up` and it runs anywhere Docker does.

---

## Contributing

PRs welcome. Key areas:
- More agent roles (UX researcher, security reviewer)
- PDF export for the pitch deck
- Auth + history page
- Better streaming UI animations
