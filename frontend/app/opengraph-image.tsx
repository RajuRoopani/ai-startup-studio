import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AI Startup Studio — Your startup idea, torn apart by 8 AI specialists";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(14,165,233,0.12) 0%, transparent 50%)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(99,102,241,0.2)",
            border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: "24px",
            padding: "8px 20px",
            marginBottom: "32px",
          }}
        >
          <span style={{ fontSize: "20px" }}>✦</span>
          <span style={{ color: "#a5b4fc", fontSize: "18px", fontWeight: 600, letterSpacing: "0.05em" }}>
            AI STARTUP STUDIO
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "68px",
            fontWeight: 800,
            lineHeight: 1.05,
            color: "#f1f5f9",
            marginBottom: "24px",
            maxWidth: "900px",
          }}
        >
          Your startup idea,{" "}
          <span style={{ color: "#818cf8" }}>torn apart</span>
          {" "}then built.
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: "26px",
            color: "#94a3b8",
            marginBottom: "48px",
            maxWidth: "760px",
            lineHeight: 1.4,
          }}
        >
          8 AI specialists · 4-phase pipeline · 8 investor-ready artifacts
        </div>

        {/* Agent pill row */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", maxWidth: "900px" }}>
          {[
            { label: "Market Analyst", color: "#6366f1" },
            { label: "VC Partner",     color: "#f59e0b" },
            { label: "Tech Architect", color: "#0ea5e9" },
            { label: "Legal Advisor",  color: "#10b981" },
            { label: "PM",             color: "#8b5cf6" },
            { label: "Growth",         color: "#ec4899" },
            { label: "CFO",            color: "#f97316" },
            { label: "Founder",        color: "#06b6d4" },
          ].map(({ label, color }) => (
            <div
              key={label}
              style={{
                background: `${color}22`,
                border: `1px solid ${color}55`,
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "18px",
                color: color,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
