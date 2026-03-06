# ChannelIQ Analytics — Product Specification

> **Version 1.0** · Based on full 8-agent AI analysis · Studio session `6503b30e`

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Target Users & Personas](#3-target-users--personas)
4. [Jobs To Be Done](#4-jobs-to-be-done)
5. [Feature Specification (MoSCoW)](#5-feature-specification-moscow)
6. [Information Architecture](#6-information-architecture)
7. [UX Flows](#7-ux-flows)
8. [Screen Designs (UX Mocks)](#8-screen-designs-ux-mocks)
9. [Data Model](#9-data-model)
10. [API Design](#10-api-design)
11. [Tech Stack](#11-tech-stack)
12. [Privacy & Compliance Architecture](#12-privacy--compliance-architecture)
13. [Success Metrics](#13-success-metrics)
14. [MVP Scope & Phasing](#14-mvp-scope--phasing)

---

## 1. Product Overview

**ChannelIQ Analytics** is a collaboration health platform that passively monitors Microsoft Teams channel metadata and surfaces early warning signals before projects fail, teams disengage, or communication siloes form.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Teams Data     →    ChannelIQ Engine    →    Action           │
│   (metadata)          (health scoring)         (dashboard +     │
│                        + AI analysis)           interventions)  │
│                                                                 │
│   No message content ever read or stored                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Core promise:** A project channel goes quiet six weeks before a deadline. ChannelIQ catches it at week two. You fix it at week three. The project ships.

**What it is NOT:**
- Not employee surveillance
- Not message content analysis
- Not an engagement survey tool
- Not a productivity tracker

---

## 2. Problem Statement

### The Gap

| What exists | What's missing |
|-------------|----------------|
| Engagement surveys (quarterly, lagging, biased) | Real-time passive signal |
| Microsoft Viva Insights (basic usage stats) | Actionable project-level health |
| Jira/Asana ticket staleness | Communication pattern decay |
| Manual channel check-ins | Automated early warning |

### The Cost of the Gap

- Average enterprise project overrun: **+67% of original budget**
- % of CHROs who can assess collaboration health in real-time: **< 5%**
- Key contributors who disengage silently before anyone notices: **most of them**
- Time between channel decay start and project manager awareness: **4–8 weeks**

### Why Now

1. **Hybrid work made Teams the org's communication layer** — signal density has never been higher
2. **LLM costs collapsed** — intelligent intervention bots cost thousands not millions
3. **Productivity paranoia is at peak** — 85% of leaders say they can't tell if remote teams are productive (Microsoft WTI 2024)

---

## 3. Target Users & Personas

### Primary: PMO Patricia

```
┌──────────────────────────────────────────────────────────┐
│  PMO Patricia                                            │
│  Head of PMO / VP Operations                            │
│  2,500-employee B2B SaaS, Teams-first                   │
├──────────────────────────────────────────────────────────┤
│  Pain                                                    │
│  • 40+ active project channels with no health signal    │
│  • Lost 2 clients last year from silent project decay   │
│  • Bi-weekly standups that nobody prepares for          │
├──────────────────────────────────────────────────────────┤
│  Goal                                                    │
│  • System that watches channels so she doesn't have to  │
│  • Early warning before project failure, not after      │
│  • Justifiable ROI to her CFO                           │
├──────────────────────────────────────────────────────────┤
│  Budget authority  $25K–$75K/year discretionary         │
│  Sales cycle       60–90 days                           │
│  Decision trigger  "Can point to a specific past fail"  │
└──────────────────────────────────────────────────────────┘
```

### Secondary: CHRO Helen

```
┌──────────────────────────────────────────────────────────┐
│  CHRO Helen                                              │
│  Chief Human Resources Officer                          │
│  8,000-employee enterprise, post-RTO hybrid             │
├──────────────────────────────────────────────────────────┤
│  Pain                                                    │
│  • Survey fatigue — employees stop responding honestly  │
│  • Can't detect quiet quitting until it's too late      │
│  • Board asks "how healthy is our culture?" — no answer │
├──────────────────────────────────────────────────────────┤
│  Goal                                                    │
│  • Passive, continuous culture signal                   │
│  • Defend against attrition before it happens           │
│  • Board-ready org health reporting                     │
├──────────────────────────────────────────────────────────┤
│  Budget authority  $100K–$500K/year HR tech budget      │
│  Sales cycle       6–12 months (legal review required)  │
│  Decision trigger  After a high-profile attrition event │
└──────────────────────────────────────────────────────────┘
```

### Tertiary: IT Admin Alex

```
┌──────────────────────────────────────────────────────────┐
│  IT Admin Alex                                           │
│  Azure AD Administrator / Digital Workplace Lead        │
├──────────────────────────────────────────────────────────┤
│  Role in journey  Gatekeeper — approves/blocks install  │
│  Key concern      "What data leaves our tenant?"        │
│  What he needs    SOC 2 report, data flow diagram,      │
│                   explicit permission scope list        │
│  Win condition    One-click admin consent flow, clear   │
│                   privacy controls, no surprises        │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Jobs To Be Done

| Job | When | Outcome | Current solution (bad) |
|-----|------|---------|----------------------|
| Know which projects are at risk right now | Weekly Monday review | Intervene before deadline slip | Look at Jira manually |
| See which teams are disengaged without asking them | Monthly | Retain key contributors | Engagement survey |
| Prove collaboration ROI of new tooling | Board QBR | Keep budget | Usage reports from vendors |
| Find hidden experts across org | Hiring/reorg | Place right people | Ask managers |
| Respond to a channel that's gone quiet | When someone complains | Restart momentum | Schedule a meeting |

---

## 5. Feature Specification (MoSCoW)

### ✅ Must Have — MVP doesn't exist without these

#### M1: Teams OAuth Connection
- Admin consent flow via Azure AD (`ChannelMessage.Read.All` scope)
- Scope selection: admin picks which channels to monitor (not org-wide default)
- Privacy mode toggle: metadata-only vs. topic-modeling
- Setup time target: **< 15 minutes**
- Support for multiple tenants under one ChannelIQ account

#### M2: Channel Health Score
Five structural signals only (no NLP on message content in v1):

| Signal | Weight | How computed |
|--------|--------|-------------|
| Message frequency trend | 25% | 7-day vs 30-day baseline, z-score |
| Response latency | 20% | Median minutes: post → first reply |
| Participant breadth | 25% | % of members who posted in last 14 days |
| Thread depth | 15% | Average replies per conversation thread |
| Posting consistency | 15% | Coefficient of variation in daily volume |

Score: 0–100. Displayed with sub-scores. No black boxes.
> "Your score is 41 because participant breadth dropped from 68% to 22% in two weeks."

#### M3: Channel Dashboard
- All monitored channels ranked by health score
- Color-coded: 🟢 75–100 · 🟡 45–74 · 🔴 0–44
- 30-day trend sparklines per channel
- Sortable: score, trend direction, last activity, member count
- Search and filter by team/department/project tag

#### M4: Channel Deep-Dive View
- Health score breakdown with sub-signal explanations
- 90-day trend graph
- Contributor activity heatmap (anonymous: shows % of members active, not who)
- Top conversation threads list (metadata only: title, reply count, last activity)
- Recommended actions panel (manual interventions v1)

#### M5: Alerting
- Daily digest email: channels that crossed thresholds (configurable)
- Slack/Teams notification: channel health score drops > 20 points in 7 days
- Weekly health summary report: PDF-ready, shareable with leadership

#### M6: Basic Onboarding & Auth
- Email/password + SSO (Microsoft OAuth for the admin login itself)
- Workspace setup wizard
- Invite team members (viewer / analyst / admin roles)

---

### 🔵 Should Have — V1.1 (Month 3–5)

#### S1: AI Recommendations Engine
- Automated intervention suggestions per channel:
  - "Schedule a sync — this channel hasn't had a reply thread > 3 posts in 21 days"
  - "Rebalance participation — 2 members account for 80% of posts"
  - "Re-engage [anonymous role]: previously active contributor went silent 18 days ago"
- One-click action: send intervention directly as a Teams message (from the ChannelIQ bot)

#### S2: Org Collaboration Network Graph
- Force-directed graph: nodes = teams/departments, edges = cross-channel participation
- Visualizes silos, bridges, and hub individuals (anonymized)
- Zoom in/out, filter by time range, highlight at-risk clusters

#### S3: Project Health Tracking
- Group channels by project (manual tagging or auto-detect from channel name patterns)
- Project-level health roll-up across all its channels
- Timeline view: health score over project lifecycle

#### S4: Historical Benchmarking
- Compare a channel's current health to its own historical baseline
- Compare to org-wide average and industry benchmarks (anonymized aggregate data from ChannelIQ network)

---

### 🟡 Could Have — V2 (Month 6–12)

#### C1: AI Nudge Bot (Intervention Agent)
- Deployable bot per channel
- Auto-summarizes stale threads on a schedule
- Sends engagement nudges: "@team — this thread has been open 14 days. Any blockers?"
- Reports back on whether intervention improved health score

#### C2: Topic Drift Detection
- Opt-in NLP mode: detects when a project channel's conversation themes drift away from stated scope
- Flags scope creep, off-topic chatter ratio
- Privacy toggle: must be explicitly enabled by admin

#### C3: Expert Identification
- Cross-channel analysis to identify hidden subject matter experts
- Used for: staffing decisions, knowledge graph, L&D targeting
- Fully anonymized aggregates — never identifies individuals by default

#### C4: HRIS Integration
- Connect to Workday, BambooHR, or similar
- Correlate channel health patterns with attrition data (aggregate, not individual)
- Enrich channels with team structure context

#### C5: API Access
- REST API for programmatic health score reads
- Webhook delivery of health events to customer systems

---

### ❌ Won't Have (V1)

- Individual-level message monitoring or scoring
- Content analysis / sentiment of specific messages
- Integration with non-Teams platforms (Slack v2, Google Chat v3)
- Real-time < 1-hour refresh (daily batch is sufficient for v1)
- Public sharing of internal analytics

---

## 6. Information Architecture

```
ChannelIQ
│
├── Dashboard (Home)
│   ├── Health overview cards
│   ├── At-risk channels list
│   ├── Recent alerts
│   └── Quick stats (total channels, avg health, trend)
│
├── Channels
│   ├── All Channels (sortable grid)
│   ├── [Channel] Detail
│   │   ├── Health score breakdown
│   │   ├── Activity trend chart
│   │   ├── Contributor map
│   │   └── Recommendations
│   └── Channel Groups / Projects
│
├── Network Graph  [S2]
│   ├── Org collaboration map
│   ├── Silo detection
│   └── Bridge analysis
│
├── Alerts & Reports
│   ├── Alert configuration
│   ├── Weekly digest settings
│   └── Export / PDF report
│
├── Interventions  [S1]
│   ├── AI recommendations queue
│   ├── Deployed bots
│   └── Intervention history + outcomes
│
└── Settings
    ├── Teams connection (tenant / channel scope)
    ├── Privacy controls
    ├── Team members & roles
    ├── Notifications
    └── Billing
```

---

## 7. UX Flows

### Flow 1: First-Time Setup (Admin)

```
Landing Page
    │
    ▼
Sign Up (email + Microsoft SSO)
    │
    ▼
Connect Teams Tenant
    │  ← "Connect your Microsoft Teams workspace"
    │  ← "We only access metadata — never message content"
    │  ← [Connect with Microsoft] button → Azure AD consent screen
    │
    ▼
Channel Scope Selection
    │  ← Show all Teams/channels discovered
    │  ← Admin selects which to monitor (default: none selected)
    │  ← Recommended: start with project channels
    │
    ▼
Privacy Mode Selection
    │  ← Metadata only (default, recommended)
    │  ← Metadata + topic modeling (requires explicit opt-in)
    │
    ▼
First Sync (background job, ~5 min for 90 days of history)
    │  ← "We're analyzing 90 days of channel history"
    │  ← Progress bar
    │
    ▼
Dashboard (with initial health scores populated)
    │  ← Onboarding tooltip overlay on first load
    ▼
Done ✓
```

### Flow 2: Weekly Review (PMO Patricia)

```
Email: "3 channels crossed into at-risk this week"
    │
    ▼
Click → Open ChannelIQ Dashboard
    │
    ▼
Dashboard loads → At-risk section highlighted
    │  ← "3 channels dropped below 50 in the last 7 days"
    │
    ▼
Click first at-risk channel → Deep Dive View
    │  ← Sees: participant breadth dropped from 65% → 18%
    │  ← Sees: last thread with >2 replies was 23 days ago
    │  ← Sees: recommendation: "Re-engage core contributors"
    │
    ▼
Click "Send Nudge" → Compose Teams message (pre-filled)
    │  ← Sends via ChannelIQ bot to the channel
    │
    ▼
Return to dashboard → Mark channel as "Under Watch"
    │
    ▼
Done — 8 minutes total
```

### Flow 3: Leadership Report (CHRO Helen)

```
ChannelIQ Dashboard → Reports tab
    │
    ▼
Select: "Monthly Org Health Summary"
    │  ← Date range picker
    │  ← Scope: all channels / specific teams
    │
    ▼
Preview report
    │  ← Visual health score distribution
    │  ← Top 5 healthiest teams
    │  ← Top 5 at-risk channels (anonymized if needed)
    │  ← Trend vs last month
    │
    ▼
Export as PDF
    │
    ▼
Share with board ✓
```

---

## 8. Screen Designs (UX Mocks)

### Screen 1: Dashboard — Home

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ChannelIQ                                    🔔  Patricia Chen  ▾   ⚙️     │
├──────────┬──────────────────────────────────────────────────────────────────┤
│          │                                                                  │
│  🏠 Home  │   Good morning, Patricia. You have 3 channels that need         │
│          │   attention this week.                            [View all ↗]   │
│  📊 Channels│                                                               │
│          │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │
│  🕸️ Network│  │ 47 Channels    │ │ Avg Health     │ │ 🔴 At Risk     │       │
│          │  │ Monitored      │ │ Score          │ │ This Week      │       │
│  🔔 Alerts│  │                │ │                │ │                │       │
│          │  │  47            │ │   68 / 100     │ │     3          │       │
│  📋 Reports│ │                │ │  ▲ +4 vs last  │ │  ▼ was 1      │       │
│          │  │                │ │    week        │ │   last week    │       │
│  ⚡ Actions│ └────────────────┘ └────────────────┘ └────────────────┘       │
│          │                                                                  │
│  ⚙️ Settings│  At-Risk Channels                              [See all 47]   │
│          │  ┌─────────────────────────────────────────────────────────────┐ │
│          │  │  Channel                Score  Trend    Last Active  Action │ │
│          │  ├─────────────────────────────────────────────────────────────┤ │
│          │  │  🔴 #proj-atlas-launch   38    ▼ -22    3 days ago   [View] │ │
│          │  │  🔴 #q3-roadmap-review   41    ▼ -18    5 days ago   [View] │ │
│          │  │  🔴 #client-onboarding   44    ▼ -11    2 days ago   [View] │ │
│          │  │  🟡 #design-system-v2    52    ▼  -8    1 day ago    [View] │ │
│          │  │  🟡 #security-audit      55    ──  0    Today        [View] │ │
│          │  └─────────────────────────────────────────────────────────────┘ │
│          │                                                                  │
│          │  Health Distribution                                             │
│          │  ┌─────────────────────────────────────────────────────────────┐ │
│          │  │                                                             │ │
│          │  │  Healthy 🟢   ████████████████████████   31 channels (66%) │ │
│          │  │  At-risk 🟡   ████████                   13 channels (28%) │ │
│          │  │  Critical 🔴  ███                         3 channels  (6%) │ │
│          │  │                                                             │ │
│          │  └─────────────────────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

---

### Screen 2: Channel Deep Dive

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard    #proj-atlas-launch                     [⚡ Actions] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔴  Health Score: 38 / 100     ▼ Down 22 points in 7 days                │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  90-Day Health Trend                                                 │  │
│  │                                                                      │  │
│  │  100 ┤                                                               │  │
│  │   80 ┤         ╭──────╮                                              │  │
│  │   60 ┤    ╭────╯      ╰────╮                                         │  │
│  │   40 ┤   ─╯                ╰──────────────────────────╮  ← now: 38  │  │
│  │   20 ┤                                                ╰──            │  │
│  │    0 ┤────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬───    │  │
│  │      Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Score Breakdown                         Why is this low?                  │
│  ┌───────────────────────────┐           ┌───────────────────────────────┐ │
│  │  Signal           Score   │           │  ⚠️  Participant breadth       │ │
│  │  ─────────────────────── │           │  dropped from 68% → 18% in    │ │
│  │  Msg frequency    72 🟢   │           │  the last 14 days.             │ │
│  │  Response latency 61 🟡   │           │                               │ │
│  │  Participant breadth 14 🔴│           │  Only 2 of 11 members have    │ │
│  │  Thread depth     55 🟡   │           │  posted this week.            │ │
│  │  Posting consistency 43 🟡│           │                               │ │
│  └───────────────────────────┘           │  [↗ View recommendation]      │ │
│                                          └───────────────────────────────┘ │
│                                                                             │
│  Contributor Activity (last 30 days)      Recent Threads                   │
│  ┌───────────────────────────┐           ┌───────────────────────────────┐ │
│  │  ● Active (2)   ██████    │           │  "Launch checklist review"    │ │
│  │  ○ Occasional (3)  ███    │           │  12 replies · 8 days ago      │ │
│  │  ✗ Silent (6)   ░░░░░░░░  │           │                               │ │
│  │                            │           │  "Stakeholder sign-off needed"│ │
│  │  11 members total          │           │  3 replies · 14 days ago      │ │
│  │  Healthy target: ≥60%      │           │                               │ │
│  └───────────────────────────┘           │  "Timeline question"          │ │
│                                          │  0 replies · 21 days ago 🔴   │ │
│  AI Recommendations                      └───────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  1.  Re-engage silent contributors                                   │  │
│  │      "6 members haven't posted in 14+ days. A direct @mention       │  │
│  │       asking for their input often restarts participation."          │  │
│  │      [Send nudge via Teams bot →]                                    │  │
│  │                                                                      │  │
│  │  2.  Surface the unanswered thread                                   │  │
│  │      "'Timeline question' has 0 replies after 21 days.              │  │
│  │       Escalate or close."                                            │  │
│  │      [Post in channel →]                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 3: Org Collaboration Network Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Network Graph                  Filter: [All Teams ▾]  [Last 30 days ▾]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │                    ●─────────────●                                   │  │
│  │                   /  Engineering  \                                  │  │
│  │                  ●                 ●──────────────●                  │  │
│  │               Product           Design         Marketing             │  │
│  │                  ●                 ●                                 │  │
│  │                   \              /                                   │  │
│  │                    ●────────────●                                    │  │
│  │                  Sales         Finance                               │  │
│  │                                                                      │  │
│  │           ● ─────────── ● ◄── SILO DETECTED                        │  │
│  │         Legal         Ops   (no cross-team channels)                │  │
│  │                                                                      │  │
│  │   ─── Strong collaboration (5+ shared channels)                     │  │
│  │   ─ ─ Weak collaboration (1–2 shared channels)                      │  │
│  │    ·  No collaboration detected                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Insights                                                                   │
│  ┌───────────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  🔴 Silo Detected         │  │  🟢 Strong Bridge                    │   │
│  │                           │  │                                      │   │
│  │  Legal ↔ Ops have         │  │  Engineering ↔ Product: 8 shared     │   │
│  │  0 shared channels in     │  │  channels, high participation        │   │
│  │  last 30 days.            │  │  breadth. Healthy collaboration.     │   │
│  │                           │  │                                      │   │
│  │  [Recommend bridge →]     │  │  [View channels →]                   │   │
│  └───────────────────────────┘  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 4: All Channels Grid

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  All Channels (47)          [🔍 Search]  [Filter: All ▾]  [Sort: Score ▾]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [All] [🔴 At Risk: 3] [🟡 Watch: 13] [🟢 Healthy: 31]                    │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Channel                  Score  Trend    Members  Last Active  Tag  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  🔴 #proj-atlas-launch     38    ▼ -22    11       3 days ago   Q4  │  │
│  │  🔴 #q3-roadmap-review     41    ▼ -18     8       5 days ago   Q3  │  │
│  │  🔴 #client-onboarding     44    ▼ -11    14       2 days ago   CS  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  🟡 #design-system-v2      52    ▼  -8    19       1 day ago    ENG │  │
│  │  🟡 #security-audit        55    ──  0     6       Today        ENG │  │
│  │  🟡 #hiring-pipeline       58    ▲  +3    22       Today        HR  │  │
│  │  ...                                                                 │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  🟢 #all-hands-planning    91    ▲  +5    87       Today        ALL │  │
│  │  🟢 #backend-infra         88    ──  0    12       Today        ENG │  │
│  │  🟢 #product-weekly        85    ▲  +2    31       Today        PRD │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 5: Onboarding — Connect Teams

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                      ✦  ChannelIQ Analytics                                │
│                                                                             │
│                  Let's connect your Microsoft Teams workspace.              │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   🔒  Privacy-first, always                                          │  │
│  │                                                                      │  │
│  │   ChannelIQ reads metadata only:                                     │  │
│  │                                                                      │  │
│  │   ✅  Message timestamps and frequency                               │  │
│  │   ✅  Reply counts and thread structure                              │  │
│  │   ✅  Participant counts (anonymized)                                │  │
│  │   ✅  Channel activity patterns                                      │  │
│  │                                                                      │  │
│  │   ❌  Message content — never read, never stored                     │  │
│  │   ❌  Individual identity mapping — all signals aggregated           │  │
│  │   ❌  Private chats or DMs — only selected channels                  │  │
│  │                                                                      │  │
│  │                  [  Connect with Microsoft  ]                        │  │
│  │                                                                      │  │
│  │            SOC 2 Type II Certified  ·  GDPR Compliant                │  │
│  │            Data stays in your region  ·  No resale ever              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│       Step 1 of 3: Connect         ○─────────○─────────○                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 6: Weekly Digest Email

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  From: ChannelIQ <digest@channeliq.ai>                                      │
│  To: patricia@company.com                                                   │
│  Subject: 🔴 3 channels need attention this week · ChannelIQ Weekly        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ✦ ChannelIQ Weekly Digest — Week of Dec 2, 2024                          │
│                                                                             │
│   Overall org health: 68/100  ▲ +4 from last week                         │
│                                                                             │
│   ─────────────────────────────────────────────                            │
│   🔴 NEEDS ATTENTION (3 channels)                                           │
│   ─────────────────────────────────────────────                            │
│                                                                             │
│   #proj-atlas-launch   Score: 38  ▼ -22                                    │
│   Participant breadth dropped from 68% → 18%. 6 members silent.            │
│   [View channel →]                                                          │
│                                                                             │
│   #q3-roadmap-review   Score: 41  ▼ -18                                    │
│   No threads with >2 replies in 23 days. Low engagement.                   │
│   [View channel →]                                                          │
│                                                                             │
│   #client-onboarding   Score: 44  ▼ -11                                    │
│   Response latency up to 4.2h avg (was 1.1h). Urgent threads unanswered.  │
│   [View channel →]                                                          │
│                                                                             │
│   ─────────────────────────────────────────────                            │
│   🟢 BRIGHT SPOTS                                                           │
│   ─────────────────────────────────────────────                            │
│   #all-hands-planning  Score: 91  ▲ +5   Most active channel this week    │
│   #backend-infra        Score: 88  ──  0   Consistently healthy            │
│                                                                             │
│   [Open full dashboard →]   [Manage alerts]   [Unsubscribe]               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 7: Intervention / AI Actions Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI Actions                    3 pending recommendations                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Recommended for #proj-atlas-launch          Priority: HIGH 🔴       │  │
│  │                                                                      │  │
│  │  📢  Re-engagement nudge                                             │  │
│  │  ────────────────────────────────────────────────────────────────   │  │
│  │  6 members have gone silent. A direct nudge from a neutral bot      │  │
│  │  is 3x more likely to restart participation than a manager ask.     │  │
│  │                                                                      │  │
│  │  Preview message:                                                    │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  Hey #proj-atlas-launch team 👋                                │ │  │
│  │  │                                                                │ │  │
│  │  │  Quick check-in: this channel has been quieter than usual     │ │  │
│  │  │  over the past two weeks. Are there blockers we should        │ │  │
│  │  │  surface? Any threads that need a decision?                   │ │  │
│  │  │                                                               │ │  │
│  │  │  — ChannelIQ Bot                                              │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  [Edit message]          [Send to Teams →]          [Dismiss]        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Past Interventions                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Channel            Sent        Type        Outcome                  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  #design-q4         Nov 18      Re-engage   Score: 44→71 ✅ +27      │  │
│  │  #hiring-pipeline   Nov 12      Thread bump Score: 51→58 ✅ +7       │  │
│  │  #infra-planning    Nov 5       Re-engage   Score: 38→41 ⚠️ +3       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Model

```sql
-- Core tenant / account
CREATE TABLE tenants (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'starter',     -- starter|growth|enterprise
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Teams workspaces connected to a tenant
CREATE TABLE teams_connections (
  id              UUID PRIMARY KEY,
  tenant_id       UUID REFERENCES tenants(id),
  ms_tenant_id    TEXT NOT NULL,                       -- Azure AD tenant ID
  display_name    TEXT,
  access_token    TEXT,                                -- encrypted
  refresh_token   TEXT,                                -- encrypted
  token_expires   TIMESTAMPTZ,
  privacy_mode    TEXT DEFAULT 'metadata_only',        -- metadata_only|topic_modeling
  connected_at    TIMESTAMPTZ DEFAULT NOW(),
  last_sync       TIMESTAMPTZ
);

-- Channels being monitored
CREATE TABLE channels (
  id              UUID PRIMARY KEY,
  connection_id   UUID REFERENCES teams_connections(id),
  ms_channel_id   TEXT NOT NULL,
  ms_team_id      TEXT NOT NULL,
  display_name    TEXT,
  member_count    INT,
  created_at_ms   TIMESTAMPTZ,                         -- when created in Teams
  monitored_since TIMESTAMPTZ DEFAULT NOW(),
  tags            TEXT[]                               -- user-applied tags
);

-- Daily health snapshots per channel
CREATE TABLE channel_health_snapshots (
  id                    UUID PRIMARY KEY,
  channel_id            UUID REFERENCES channels(id),
  snapshot_date         DATE NOT NULL,
  health_score          SMALLINT NOT NULL,              -- 0-100
  msg_frequency_score   SMALLINT,
  response_latency_score SMALLINT,
  participant_breadth_score SMALLINT,
  thread_depth_score    SMALLINT,
  posting_consistency_score SMALLINT,
  -- raw signals (no content)
  total_messages        INT,
  unique_active_members INT,
  avg_response_latency_min FLOAT,
  avg_thread_depth      FLOAT,
  msg_volume_cv         FLOAT,                         -- coefficient of variation
  UNIQUE (channel_id, snapshot_date)
);
CREATE INDEX idx_snapshots_channel_date ON channel_health_snapshots(channel_id, snapshot_date DESC);

-- Alerts fired
CREATE TABLE alerts (
  id              UUID PRIMARY KEY,
  tenant_id       UUID REFERENCES tenants(id),
  channel_id      UUID REFERENCES channels(id),
  alert_type      TEXT,                                -- score_drop|threshold_cross|silence
  severity        TEXT,                                -- low|medium|high|critical
  score_before    SMALLINT,
  score_after     SMALLINT,
  details         JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  acknowledged    BOOLEAN DEFAULT FALSE
);

-- AI recommendations
CREATE TABLE recommendations (
  id              UUID PRIMARY KEY,
  channel_id      UUID REFERENCES channels(id),
  rec_type        TEXT,                                -- re_engage|surface_thread|rebalance
  message_text    TEXT,
  status          TEXT DEFAULT 'pending',              -- pending|sent|dismissed|resolved
  sent_at         TIMESTAMPTZ,
  score_before    SMALLINT,
  score_after     SMALLINT,                            -- measured 7 days post-send
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Users (customers)
CREATE TABLE users (
  id              UUID PRIMARY KEY,
  tenant_id       UUID REFERENCES tenants(id),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  role            TEXT DEFAULT 'viewer',               -- viewer|analyst|admin
  ms_user_id      TEXT,                                -- Azure AD identity
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. API Design

### Authentication
All endpoints require `Authorization: Bearer {jwt}`. JWT issued on login, 24h TTL.

### Core Endpoints

```
GET    /api/v1/health
       → { status: "ok", db: "ok" }

# Channels
GET    /api/v1/channels
       ?sort=score|trend|last_active
       ?filter=at_risk|watch|healthy
       ?search=string
       → { channels: ChannelSummary[], total: int }

GET    /api/v1/channels/:id
       → ChannelDetail (scores, 90-day history, contributor stats)

GET    /api/v1/channels/:id/history
       ?days=30|60|90
       → { snapshots: DailySnapshot[] }

GET    /api/v1/channels/:id/recommendations
       → { recommendations: Recommendation[] }

# Dashboard
GET    /api/v1/dashboard/summary
       → { total_channels, avg_health, at_risk_count, healthy_count,
           score_distribution, trend_vs_last_week }

# Alerts
GET    /api/v1/alerts
       ?unread_only=true
       → { alerts: Alert[] }

PATCH  /api/v1/alerts/:id/acknowledge
       → { ok: true }

# Interventions
POST   /api/v1/interventions
       body: { channel_id, message_text, type }
       → { sent: true, intervention_id }

GET    /api/v1/interventions
       → { interventions: Intervention[] }

# Reports
POST   /api/v1/reports/generate
       body: { type: "monthly_summary", scope: "all"|channel_ids[], date_range }
       → { report_url: string }  ← PDF download link, expires 1h

# Settings
GET    /api/v1/connections
       → { connections: TeamsConnection[] }

POST   /api/v1/connections
       body: { ms_tenant_id, admin_consent_code, privacy_mode }
       → { connection_id, channels_discovered: int }

PATCH  /api/v1/channels/:id/monitoring
       body: { enabled: bool, tags: string[] }
       → { ok: true }

# Webhooks (internal — Graph Change Notifications inbound)
POST   /internal/webhooks/teams
       → 200 OK (validation) or event processing
```

---

## 11. Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend                                                       │
│  Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui   │
│  D3.js (org network graph)                                      │
│  Recharts (health score charts)                                 │
│  Deployed: Vercel                                               │
├─────────────────────────────────────────────────────────────────┤
│  API Layer                                                      │
│  Node.js / TypeScript (Hono or Fastify)                         │
│  Auth: Clerk (SSO + Microsoft OAuth)                            │
│  Rate limiting: per-tenant + per-IP                             │
├─────────────────────────────────────────────────────────────────┤
│  Analytics Engine                                               │
│  Python FastAPI                                                 │
│  Celery + Redis (daily batch jobs)                              │
│  Nightly scoring pipeline per tenant                            │
├─────────────────────────────────────────────────────────────────┤
│  Data                                                           │
│  PostgreSQL (primary — channel snapshots, user data)            │
│  Redis (job queue, caching, rate limits)                        │
│  S3-compatible store (PDF reports, audit logs)                  │
├─────────────────────────────────────────────────────────────────┤
│  Microsoft Integration                                          │
│  Microsoft Graph API (Teams metadata)                           │
│  Graph Change Notifications (webhooks for real-time updates)    │
│  Azure AD (admin consent OAuth flow)                            │
│  Microsoft Bot Framework (intervention bot in Teams)            │
├─────────────────────────────────────────────────────────────────┤
│  AI (v1.1+)                                                     │
│  Claude Sonnet — recommendation generation                      │
│  Claude Haiku — digest copy, nudge message drafting             │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure                                                 │
│  Docker Compose (dev) → Kubernetes (prod)                       │
│  Region-pinned: US East, EU West (GDPR requirement)             │
│  SOC 2 Type II audit path from day one                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Privacy & Compliance Architecture

### The Non-Negotiables

```
DATA INGESTED:                        DATA NOT INGESTED:
✅ Message timestamps                  ❌ Message body / content
✅ Thread structure (reply counts)     ❌ File attachments or names
✅ Channel member list                 ❌ Private chats / DMs
✅ User IDs (hashed on ingest)         ❌ Individual user identity
✅ Reaction counts                     ❌ @mention targets
```

### Privacy Controls (admin-configurable)

| Control | Default | Effect |
|---------|---------|--------|
| **Metadata-only mode** | ON | No NLP, no topic extraction, structural signals only |
| **Anonymization level** | Aggregated | Sub-5-member channels suppressed; no individual breakdowns |
| **Data retention** | 12 months | Snapshots older than retention window auto-deleted |
| **Channel exclusions** | None | Admins can exclude specific channels (e.g., #exec-team) |
| **Right to delete** | Available | Tenant data wiped on request within 30 days |

### Compliance Checklist (Pre-Launch)
- [ ] SOC 2 Type II audit engagement (start Month 2)
- [ ] DPA template for EU customers (GDPR Article 28)
- [ ] Privacy impact assessment (DPIA) for enterprise deals
- [ ] Works council disclosure template for German/French customers
- [ ] Microsoft ISV partner application
- [ ] Data processing agreement with all sub-processors

---

## 13. Success Metrics

### Activation
| Metric | Target | Measure |
|--------|--------|---------|
| Time to first health score | < 15 min post-signup | Onboarding funnel |
| Channels connected in setup | ≥ 5 per new account | Onboarding completion |
| % of trials that connect Teams | > 70% | Trial conversion |

### Engagement
| Metric | Target | Measure |
|--------|--------|---------|
| Weekly active accounts (opened app) | > 60% of paying | Product analytics |
| Digest email open rate | > 45% | Email platform |
| Channels reviewed per session | ≥ 3 | Session analytics |
| Interventions sent per week | ≥ 1 per account | Feature usage |

### Retention & Revenue
| Metric | Target | Measure |
|--------|--------|---------|
| Net Revenue Retention (NRR) | > 110% | Billing system |
| Annual contract renewal rate | > 85% | CRM |
| Expansion (add channels / users) | > 30% of accounts in Year 1 | CRM |
| Time to value (first "wow" moment) | < 48 hours after connection | Support + NPS timing |

### Business
| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| ARR | $480K | $2.4M | $7.2M |
| Paying accounts | 20 | 60 | 180 |
| Gross margin | 68% | 72% | 76% |
| Net burn / month | $165K | $210K | $85K |

---

## 14. MVP Scope & Phasing

### MVP (Month 0–3): The "Does It Work?" Product

**Goal:** 5 paying design partners. Prove the health score is trustworthy and actionable.

Scope:
- M1: Teams OAuth connection
- M2: Channel health score (5 structural signals)
- M3: Dashboard (sorted channel list + sparklines)
- M4: Deep dive view (score breakdown + contributor map)
- M5: Email digest (weekly)
- Basic auth (email + Microsoft SSO)

**Success criteria:** 3 of 5 design partners say "I caught something I would have missed." and pay for Year 2.

---

### V1.1 (Month 4–6): The "Why Should I Pay?" Product

**Goal:** 20 paying accounts, $480K ARR

Scope adds:
- S1: AI recommendations engine (actionable, not just analytical)
- S2: Org collaboration network graph (the "wow" demo moment)
- S4: Historical benchmarking + industry comparisons
- Slack + Teams notification delivery
- Admin roles + multi-user support

---

### V2 (Month 7–12): The "I Can't Live Without This" Product

**Goal:** 60 paying accounts, $2.4M ARR, Series A ready

Scope adds:
- C1: AI nudge bot (automated intervention agent deployed into Teams)
- C2: Topic drift detection (opt-in NLP)
- C3: Expert identification
- C4: HRIS integration (Workday / BambooHR)
- C5: API access (for enterprise IT integration)
- SOC 2 Type II certification

---

## Appendix: Open Questions

Before starting build, resolve:

1. **IP ownership of GCAgent framework** — if it originated in academia, get IP cleared before incorporating
2. **Microsoft ISV partnership** — apply immediately; it doesn't give contractual protection but opens co-sell motion
3. **Privacy legal review** — get a GDPR opinion on the data model before touching EU customers
4. **Works council strategy** — create a "legal pack" for European deals (template DPA + DPIA) before first EU pilot
5. **Anonymization threshold** — decide: suppress scores for channels with < 5 members? < 10? Get GDPR counsel input
6. **Pricing validation** — run 3 discovery calls with PMO/CHRO buyers before locking pricing; test $18K vs $24K Starter

---

*Generated from full 8-agent AI analysis · ChannelIQ Studio Session `6503b30e` · AI Startup Studio*
