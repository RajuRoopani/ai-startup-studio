const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface SessionResponse {
  session_id: string;
  share_slug: string;
  status: string;
}

export interface ArtifactOut {
  key: string;
  title: string;
  content: string;
  created_at: string;
}

export interface AgentMessageOut {
  id: number;
  agent_role: string;
  phase: number;
  content: string;
  created_at: string;
}

export interface SessionDetail {
  id: string;
  idea: string;
  status: string;
  share_slug: string;
  created_at: string;
  completed_at: string | null;
  artifacts: ArtifactOut[];
  messages: AgentMessageOut[];
}

export async function createSession(idea: string): Promise<SessionResponse> {
  const res = await fetch(`${BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create session");
  }
  return res.json();
}

export async function getSession(id: string): Promise<SessionDetail> {
  const res = await fetch(`${BASE}/api/sessions/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Session not found");
  return res.json();
}

export async function getSessionBySlug(slug: string): Promise<SessionDetail> {
  const res = await fetch(`${BASE}/api/sessions/slug/${slug}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Session not found");
  return res.json();
}

export function streamSession(sessionId: string): EventSource {
  return new EventSource(`${BASE}/api/sessions/${sessionId}/stream`);
}

export interface TrendItem {
  id: string;
  source: "github" | "hn" | "arxiv";
  title: string;
  description: string;
  url: string;
  signal: string;
  tags: string[];
}

export interface SparkIdea {
  name: string;
  tagline: string;
  problem: string;
  solution: string;
  why_now: string;
  market: string;
  revenue: string;
  inspiration: string[];
}

export async function getTrends(): Promise<TrendItem[]> {
  const res = await fetch(`${BASE}/api/trends`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch trends");
  const data = await res.json();
  return data.trends;
}

export async function sparkIdeas(trends: TrendItem[]): Promise<SparkIdea[]> {
  const res = await fetch(`${BASE}/api/spark-ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trends }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to generate ideas");
  }
  const data = await res.json();
  return data.ideas;
}

export interface IdeaRecord {
  id: string;
  idea_name: string;
  tagline: string;
  problem: string;
  solution: string;
  why_now: string;
  market: string;
  revenue: string;
  inspiration: string[];
  trend_signals: TrendItem[];
  github_url: string | null;
  created_at: string;
}

export async function getIdeasHistory(): Promise<IdeaRecord[]> {
  const res = await fetch(`${BASE}/api/ideas/history`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch ideas history");
  const data = await res.json();
  return data.ideas;
}
