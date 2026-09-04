import { useState, useEffect } from "react";

type Screen = "home" | "loading" | "result-supported" | "result-harmful" | "history" | "error";

// Shared popup card size — every popup screen (Home/Loading/Error/Result) uses this
// so the extension window doesn't jump in size as the user navigates between them.
// History Dashboard is a separate full page (history.html), not the popup, so it's excluded.
const POPUP_WIDTH = 340;
const POPUP_MIN_HEIGHT = 520;

// ── API ──────────────────────────────────────────────────────────────────────
type VerifyResult = {
  verdict: "Supported" | "Partially Supported" | "Insufficient Evidence" | "Potentially Harmful";
  harmLevel: "Low" | "Medium" | "High";
  confidence: number;
  explanation: string;
  sources: { name: string; url: string }[];
};

async function verifyClaim(claim: string): Promise<VerifyResult> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/verify-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim }),
  });
  if (!res.ok) throw new Error("Verification failed");
  return res.json();
}

type HistoryItem = { id: number; claim: string; status: Status; time: string; source: string };

function verdictToStatus(v: VerifyResult["verdict"]): Status {
  if (v === "Supported") return "supported";
  if (v === "Partially Supported") return "partial";
  if (v === "Insufficient Evidence") return "insufficient";
  return "harmful";
}

async function saveToHistory(claim: string, data: VerifyResult) {
  const item: HistoryItem = {
    id: Date.now(),
    claim,
    status: verdictToStatus(data.verdict),
    time: "Just now",
    source: "Manual check",
  };
  const stored = await chrome.storage?.local?.get<{ history?: HistoryItem[] }>("history");
  const list: HistoryItem[] = stored?.history ?? [];
  await chrome.storage?.local?.set({ history: [item, ...list] });
}

type Status = "supported" | "partial" | "insufficient" | "harmful";

const LOADING_MSGS = ["Extracting claim…", "Retrieving evidence…", "Analyzing…"];

const STRENGTH_DOT: Record<string, string> = {
  High: "bg-[#20B2AA]",
  Moderate: "bg-amber-400",
  Limited: "bg-orange-400",
};

// ── Grain overlay via inline SVG filter ──────────────────────────────────────
function GrainLayer() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.045, zIndex: 50 }}
      preserveAspectRatio="xMidYMid slice"
    >
      <filter id="hc-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="4" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#hc-grain)" />
    </svg>
  );
}

// ── Pulse mark + logo badge ──────────────────────────────────────────────────
function PulseIcon({
  size = 24,
  color = "#FFFFFF",
  strokeWidth = 2.4,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg width={size} height={size * 0.52} viewBox="0 0 92 48" fill="none" aria-hidden="true">
      <polyline
        points="0,24 16,24 22,10 28,38 34,4 40,24 92,24"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function LogoBadge({ size = 64, radius }: { size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.3);
  return (
    <div
      aria-label="HealthClaim logo"
      className="flex items-center justify-center flex-none"
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: "linear-gradient(135deg, #3ED6C9 0%, #20B2AA 60%, #178F88 100%)",
        boxShadow: "0 12px 24px -8px rgba(32,178,170,0.5)",
      }}
    >
      <PulseIcon size={Math.round(size * 0.46)} color="#FFFFFF" strokeWidth={Math.max(1.8, size * 0.045)} />
    </div>
  );
}

// Backwards-compatible alias so any existing usage keeps working.
function ShieldLogo({ size = 32 }: { size?: number }) {
  return <LogoBadge size={size} radius={Math.round(size * 0.32)} />;
}

// ── Error ─────────────────────────────────────────────────────────────────────
function ErrorScreen({
  onRetry,
  title = "Couldn't verify this claim",
  message = "Something went wrong while checking the evidence. Please try again.",
  retryLabel = "Try again",
}: {
  onRetry: () => void;
  title?: string;
  message?: string;
  retryLabel?: string;
}) {
  return (
    <div
      className="relative overflow-hidden flex flex-col items-center justify-center gap-5 rounded-[22px]"
      style={{
        width: POPUP_WIDTH,
        minHeight: POPUP_MIN_HEIGHT,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F3FBFA 100%)",
        boxShadow: "0 4px 14px rgba(11,31,58,0.05), 0 24px 60px -20px rgba(11,31,58,0.22)",
        border: "1px solid rgba(32,178,170,0.16)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: "linear-gradient(90deg, #20B2AA, #3ED6C9)", zIndex: 61 }}
      />
      <GrainLayer />
      <div className="relative flex flex-col items-center gap-5" style={{ zIndex: 60 }}>
        <div style={{ opacity: 0.6 }}>
          <ShieldLogo size={56} />
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center px-10">
          <h2
            className="font-fraunces text-[18px] font-medium text-[#0B1F3A]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {title}
          </h2>
          <p className="font-inter text-[12px] text-[#0B1F3A]" style={{ opacity: 0.45 }}>
            {message}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="mt-1 px-5 py-2.5 rounded-full font-inter text-[12px] font-semibold transition-all duration-150 hover:scale-[1.03] active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #3ED6C9 0%, #20B2AA 55%, #178F88 100%)",
            color: "#FFFFFF",
            boxShadow: "0 10px 20px -8px rgba(32,178,170,0.5)",
          }}
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}

// ── Home ─────────────────────────────────────────────────────────────────────
function HomeScreen({ onVerify, onViewHistory }: { onVerify: () => void; onViewHistory: () => void }) {
  return (
    <div
      className="relative overflow-hidden flex flex-col rounded-[22px]"
      style={{
        width: POPUP_WIDTH,
        minHeight: POPUP_MIN_HEIGHT,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F3FBFA 100%)",
        boxShadow: "0 24px 60px -20px rgba(11,31,58,0.22), 0 4px 14px rgba(11,31,58,0.05)",
        border: "1px solid rgba(32,178,170,0.16)",
      }}
    >
      <div
        aria-hidden="true"
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(90deg, #20B2AA, #3ED6C9)" }}
      />

      {/* Top row */}
      <div className="flex items-center justify-between px-[18px] pt-4">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#20B2AA" }} />
          <span className="font-inter text-[10px] uppercase tracking-[0.14em]" style={{ color: "#8a8a86" }}>
            Trusted evidence
          </span>
        </div>
        <button onClick={onViewHistory} aria-label="View history" className="flex items-center justify-center">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#b0b0aa" strokeWidth="1.3" strokeLinecap="round">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.5V8l2.5 1.5" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-[30px] pt-[22px] pb-[26px]">
        {/* Logo badge */}
        <div className="relative flex items-center justify-center mb-4">
          <div
            aria-hidden="true"
            className="absolute rounded-[26px]"
            style={{ inset: "-6px", border: "1px solid rgba(32,178,170,0.18)" }}
          />
          <div
            className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 30% 25%, #3ED6C9, #20B2AA 60%, #178F88 100%)",
              boxShadow: "0 14px 26px -8px rgba(32,178,170,0.5)",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
              <path
                d="M20 3L5.5 9.5V22C5.5 30 11.8 37 20 39C28.2 37 34.5 30 34.5 22V9.5L20 3Z"
                fill="rgba(255,255,255,0.12)"
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M9 21H14L16 15L18.5 27.5L20.5 17L22.2 22L24 21H31"
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h1 className="font-fraunces text-[26px] font-semibold text-[#0B1F3A] mb-1" style={{ letterSpacing: "-0.02em" }}>
          HealthClaim
        </h1>
        <p className="font-fraunces italic text-[13px] mb-4" style={{ color: "#178F88", letterSpacing: "0.01em" }}>
          Verify before you follow.
        </p>

        {/* Separator */}
        <div className="flex items-center gap-2.5 w-full max-w-[190px] mb-4">
          <div className="flex-1 h-px" style={{ background: "rgba(11,31,58,0.12)" }} />
          <div className="w-1 h-1 rounded-full" style={{ background: "#20B2AA" }} />
          <div className="flex-1 h-px" style={{ background: "rgba(11,31,58,0.12)" }} />
        </div>

        <p
          className="text-center font-inter text-[12.5px] leading-[1.6] max-w-[230px] mb-[22px]"
          style={{ color: "#6b6a63" }}
        >
          AI-powered evidence review for health claims found on social media and the web.
        </p>

        <button
          onClick={onVerify}
          className="cta-glow w-full py-[14px] rounded-[14px] font-inter font-semibold text-[13.5px] text-white flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #3ED6C9 0%, #20B2AA 55%, #178F88 100%)",
            letterSpacing: "0.02em",
            boxShadow: "0 12px 24px -8px rgba(32,178,170,0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Verify health claim
        </button>

        {/* Trust sources */}
        <div className="flex items-center gap-3 mt-5" style={{ opacity: 0.6 }}>
          <span className="font-inter text-[9.5px] uppercase tracking-[0.08em] text-[#0B1F3A]">
            Evidence from
          </span>
          {["WHO", "CDC", "NIH", "PubMed"].map((s) => (
            <span key={s} className="font-inter text-[10px] font-semibold text-[#0B1F3A]">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-center gap-2 py-3"
        style={{ borderTop: "1px solid rgba(32,178,170,0.1)" }}
      >
        <div className="w-4 h-px" style={{ background: "rgba(11,31,58,0.18)" }} />
        <span className="font-inter text-[9px] uppercase tracking-[0.14em]" style={{ color: "#b0b0aa" }}>
          Select text to analyze
        </span>
        <div className="w-4 h-px" style={{ background: "rgba(11,31,58,0.18)" }} />
      </div>
    </div>
  );
}

// ── Loading ──────────────────────────────────────────────────────────────────
function LoadingScreen() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      const t = setTimeout(() => {
        setMsgIdx((i) => (i + 1) % LOADING_MSGS.length);
        setFade(true);
      }, 360);
      return () => clearTimeout(t);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative overflow-hidden flex flex-col rounded-[22px]"
      style={{
        width: POPUP_WIDTH,
        minHeight: POPUP_MIN_HEIGHT,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F3FBFA 100%)",
        boxShadow: "0 24px 60px -20px rgba(11,31,58,0.22), 0 4px 14px rgba(11,31,58,0.05)",
        border: "1px solid rgba(32,178,170,0.16)",
      }}
    >
      <div
        aria-hidden="true"
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(90deg, #20B2AA, #3ED6C9)" }}
      />
      <div className="flex-1 flex flex-col items-center justify-center gap-7">
        {/* Pulsing rings */}
        <div className="relative flex items-center justify-center" style={{ width: "128px", height: "128px" }}>
          <div
            className="ring-pulse-outer absolute w-32 h-32 rounded-full"
            style={{ border: "1px solid rgba(32,178,170,0.28)" }}
          />
          <div
            className="ring-pulse-mid absolute rounded-full"
            style={{ width: "96px", height: "96px", border: "1px solid rgba(32,178,170,0.4)" }}
          />
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #3ED6C9 0%, #20B2AA 60%, #178F88 100%)",
              boxShadow: "0 14px 26px -8px rgba(32,178,170,0.5)",
            }}
          >
            <svg width="46" height="24" viewBox="0 0 92 48" fill="none">
              <polyline
                className="hc-pulse-line"
                points="0,24 16,24 22,10 28,38 34,4 40,24 92,24"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Fading message */}
        <p
          className="font-fraunces text-[15px] italic text-[#0B1F3A] transition-opacity duration-300"
          style={{ opacity: fade ? 0.9 : 0, letterSpacing: "0.01em" }}
        >
          {LOADING_MSGS[msgIdx]}
        </p>

        {/* Step dots */}
        <div className="flex gap-2">
          {LOADING_MSGS.map((_, i) => (
            <div
              key={i}
              className="rounded-[4px] transition-all duration-400"
              style={{
                width: i === msgIdx ? "16px" : "4px",
                height: "4px",
                background: i === msgIdx ? "#20B2AA" : "rgba(32,178,170,0.25)",
              }}
            />
          ))}
        </div>

        {/* Trust sources */}
        <div className="flex items-center gap-3" style={{ opacity: 0.55 }}>
          <span className="font-inter text-[9.5px] uppercase tracking-[0.08em] text-[#0B1F3A]">
            Cross-checking
          </span>
          {["WHO", "CDC", "NIH"].map((s) => (
            <span key={s} className="font-inter text-[10px] font-semibold text-[#0B1F3A]">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Result ───────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<VerifyResult["verdict"], { pillBg: string; pillText: string; pillBorder: string; barFrom: string; barTo: string; barWidth: string; borderColor: string; accentText: string; dot: string }> = {
  Supported: {
    pillBg: "#E8F7F5",
    pillText: "#0F6E56",
    pillBorder: "rgba(32,178,170,0.3)",
    barFrom: "#20B2AA",
    barTo: "#3ED6C9",
    barWidth: "88%",
    borderColor: "#20B2AA",
    accentText: "#0F6E56",
    dot: "#20B2AA",
  },
  "Partially Supported": {
    pillBg: "#FDF3E3",
    pillText: "#854F0B",
    pillBorder: "rgba(239,159,39,0.35)",
    barFrom: "#EF9F27",
    barTo: "#FBC96B",
    barWidth: "58%",
    borderColor: "#EF9F27",
    accentText: "#854F0B",
    dot: "#EF9F27",
  },
  "Insufficient Evidence": {
    pillBg: "#F1F1EF",
    pillText: "#57564F",
    pillBorder: "rgba(87,86,79,0.25)",
    barFrom: "#9a988e",
    barTo: "#c7c5ba",
    barWidth: "35%",
    borderColor: "#9a988e",
    accentText: "#57564F",
    dot: "#9a988e",
  },
  "Potentially Harmful": {
    pillBg: "#FCEBEB",
    pillText: "#A32D2D",
    pillBorder: "rgba(226,75,74,0.3)",
    barFrom: "#E24B4A",
    barTo: "#F09595",
    barWidth: "8%",
    borderColor: "#E24B4A",
    accentText: "#A32D2D",
    dot: "#E24B4A",
  },
};

function ResultScreen({
  result,
  claim,
  onClose,
}: {
  result: VerifyResult;
  claim: string;
  onClose: () => void;
}) {
  const [accordionOpen, setAccordionOpen] = useState(false);
  const s = STATUS_STYLE[result.verdict];
  const isHarmful = result.verdict === "Potentially Harmful" || result.verdict === "Insufficient Evidence";
  // Prefer the backend's real confidence score; fall back to the per-verdict
  // default width if a response ever comes back without one.
  const barWidth =
    typeof result.confidence === "number" && !Number.isNaN(result.confidence)
      ? `${Math.round(Math.max(0, Math.min(1, result.confidence)) * 100)}%`
      : s.barWidth;

  const footerButtons = [
    {
      tip: "More context",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="8" cy="8" r="6.5" />
          <line x1="8" y1="6.5" x2="8" y2="11" />
          <circle cx="8" cy="4.8" r="0.6" fill="currentColor" />
        </svg>
      ),
    },
    {
      tip: "Explain simply",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M2 4.5h12M2 8h8.5M2 11.5h5.5" />
        </svg>
      ),
    },
    {
      tip: "Share result",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="12" cy="3" r="1.8" />
          <circle cx="3.5" cy="8" r="1.8" />
          <circle cx="12" cy="13" r="1.8" />
          <line x1="5.3" y1="7.1" x2="10.2" y2="3.9" />
          <line x1="5.3" y1="8.9" x2="10.2" y2="12.1" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="relative overflow-hidden flex flex-col rounded-[22px]"
      style={{
        width: POPUP_WIDTH,
        minHeight: POPUP_MIN_HEIGHT,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F3FBFA 100%)",
        boxShadow: "0 24px 60px -20px rgba(11,31,58,0.22), 0 4px 14px rgba(11,31,58,0.05)",
        border: "1px solid rgba(32,178,170,0.16)",
      }}
    >
      <div
        aria-hidden="true"
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(90deg, #20B2AA, #3ED6C9)" }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-[18px] py-[14px]"
        style={{ borderBottom: "1px solid rgba(32,178,170,0.12)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-[26px] h-[26px] rounded-[9px] flex items-center justify-center overflow-hidden"
            style={{ background: "linear-gradient(135deg, #3ED6C9, #20B2AA 60%, #178F88)" }}
          >
            <svg width="16" height="9" viewBox="0 0 92 48" fill="none">
              <polyline points="0,24 16,24 22,10 28,38 34,4 40,24 92,24" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <span className="font-fraunces text-[13.5px] font-medium text-[#0B1F3A]">
            HealthClaim
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-[26px] h-[26px] flex items-center justify-center rounded-full transition-colors"
          style={{ border: "1px solid rgba(11,31,58,0.12)", color: "#8a8a86" }}
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
            <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-[18px] py-4">
        {/* Claim card */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(11,31,58,0.08)",
            boxShadow: "0 2px 8px rgba(11,31,58,0.04)",
          }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="font-inter text-[9.5px] font-semibold text-[#9a988e] tracking-[0.14em] uppercase"
            >
              Claim Detected
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(11,31,58,0.08)" }} />
          </div>
          <p className="font-fraunces text-[15px] font-medium text-[#0B1F3A] leading-[1.55]">
            {claim}
          </p>
        </div>

        {/* Status + confidence */}
        <div className="flex flex-col gap-2 mt-3.5">
          <span
            className="self-start px-3.5 py-1.5 rounded-full font-inter text-[11.5px] font-semibold"
            style={{ background: s.pillBg, color: s.pillText, border: `1px solid ${s.pillBorder}` }}
          >
            {result.verdict}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="font-inter text-[10.5px] text-[#9a988e]">Evidence confidence</span>
          </div>
          <div
            className="h-[5px] rounded-[4px] overflow-hidden"
            style={{ background: "rgba(11,31,58,0.07)" }}
          >
            <div
              className="h-full rounded-[4px] transition-all duration-1000"
              style={{
                width: barWidth,
                background: `linear-gradient(90deg, ${s.barFrom}, ${s.barTo})`,
              }}
            />
          </div>
        </div>

        {/* What Evidence Says */}
        <div
          className="pl-[14px] mt-4"
          style={{ borderLeft: `3px solid ${s.borderColor}` }}
        >
          <p
            className="font-inter text-[10.5px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: s.accentText }}
          >
            What Evidence Says
          </p>
          <p className="font-inter text-[13px] leading-[1.6] mt-1.5" style={{ color: "#4a4a45" }}>
            {result.explanation}
          </p>
        </div>

        {/* Accordion */}
        <div
          className="rounded-xl overflow-hidden mt-3.5"
          style={{ border: "1px solid rgba(11,31,58,0.08)" }}
        >
          <button
            onClick={() => setAccordionOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3.5 py-3 transition-colors hover:bg-[#0B1F3A]/[0.03]"
          >
            <span className="font-inter text-[12.5px] font-medium text-[#0B1F3A]">
              {isHarmful ? "Why is this harmful?" : "Nuances & Caveats"}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="#9a988e"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="transition-transform duration-250"
              style={{ transform: accordionOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path d="M2 4.5L6 8L10 4.5" />
            </svg>
          </button>
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: accordionOpen ? "160px" : "0px" }}
          >
            <div
              className="px-4 pb-4 pt-3"
              style={{ borderTop: "1px solid rgba(11,31,58,0.06)" }}
            >
              <p
                className="font-inter text-[12px] text-[#0B1F3A] leading-[1.72]"
                style={{ opacity: 0.52 }}
              >
                {result.explanation}
              </p>
            </div>
          </div>
        </div>

        {/* Evidence sources */}
        <div>
          <p
            className="font-inter text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9a988e] mb-2.5"
          >
            Evidence Sources
          </p>
          <div className="flex gap-2">
            {result.sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl py-2.5 px-2 text-center transition-colors hover:bg-[#E8F7F5]"
                style={{ background: "#F3FBFA", border: "1px solid rgba(32,178,170,0.18)" }}
              >
                <div className="font-inter text-[11px] font-semibold text-[#0B1F3A]">{src.name}</div>
                <div className="font-inter text-[9px] text-[#9a988e] mt-0.5">Evidence source</div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-around py-3"
        style={{ borderTop: "1px solid rgba(32,178,170,0.12)" }}
      >
        {footerButtons.map(({ tip, icon }) => (
          <button
            key={tip}
            className="flex flex-col items-center gap-1"
            aria-label={tip}
          >
            <span style={{ color: "#20B2AA" }}>{icon}</span>
            <span className="font-inter text-[9.5px]" style={{ color: "#6b6a63" }}>
              {tip.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── History Dashboard ────────────────────────────────────────────────────────
const HISTORY: { id: number; claim: string; status: Status; time: string; source: string }[] = [
  { id: 1, claim: `"Drinking lemon water on an empty stomach detoxifies the liver."`, status: "insufficient", time: "2h ago", source: "Instagram" },
  { id: 2, claim: `"Vitamin D supplements reduce COVID-19 severity by 60%."`, status: "partial", time: "Yesterday", source: "Twitter/X" },
  { id: 3, claim: `"Dark chocolate may reduce cardiovascular disease risk when consumed in moderation."`, status: "supported", time: "3 days ago", source: "WebMD" },
  { id: 4, claim: `"Drinking bleach in small doses eliminates cancer cells and boosts immunity."`, status: "harmful", time: "1 week ago", source: "TikTok" },
  { id: 5, claim: `"Seed oils are the sole root cause of all modern chronic disease."`, status: "insufficient", time: "2 weeks ago", source: "Substack" },
  { id: 6, claim: `"Intermittent fasting reverses type 2 diabetes in most patients."`, status: "partial", time: "3 weeks ago", source: "YouTube" },
];

const STATUS_DOT: Record<Status, string> = {
  supported: "#20B2AA",
  partial: "#EF9F27",
  insufficient: "#9a988e",
  harmful: "#E24B4A",
};
const STATUS_TEXT: Record<Status, string> = {
  supported: "#0F6E56",
  partial: "#854F0B",
  insufficient: "#57564F",
  harmful: "#A32D2D",
};
const STATUS_LABEL: Record<Status, string> = {
  supported: "Supported",
  partial: "Partial",
  insufficient: "Insufficient",
  harmful: "Harmful",
};

const FILTERS = ["All", "Supported", "Partial", "Harmful"] as const;
type Filter = typeof FILTERS[number];

// Seed/mock rows use small hand-written ids (1, 2, 3…) and already carry a
// human-readable time string ("2h ago") — show those as-is. Real saved rows
// use Date.now() as their id, so we can derive an always-current relative
// time from it instead of trusting whatever was baked in at save-time.
function formatRelativeTime(item: HistoryItem): string {
  if (item.id < 1e12) return item.time;
  const diffMs = Date.now() - item.id;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week}w ago`;
  return new Date(item.id).toLocaleDateString();
}

// Post URLs are long ("https://x.com/handle/status/209386…") — map known
// platforms to a friendly label (matching the style already used in the
// seed/mock rows: "Twitter/X", "Instagram", "Reddit"…). Falls back to the
// bare hostname for unrecognized domains, and passes non-URL sources
// ("Manual check") through unchanged. The full link is still available via
// the row's title tooltip.
const PLATFORM_LABEL: Record<string, string> = {
  "x.com": "Twitter/X",
  "twitter.com": "Twitter/X",
  "instagram.com": "Instagram",
  "reddit.com": "Reddit",
  "old.reddit.com": "Reddit",
  "tiktok.com": "TikTok",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "facebook.com": "Facebook",
  "threads.net": "Threads",
  "linkedin.com": "LinkedIn",
};

function formatSource(source: string): string {
  try {
    const hostname = new URL(source).hostname.replace(/^www\./, "");
    return PLATFORM_LABEL[hostname] ?? hostname;
  } catch {
    return source;
  }
}

function isValidUrl(source: string): boolean {
  try {
    new URL(source);
    return true;
  } catch {
    return false;
  }
}

function exportCsv(items: HistoryItem[]) {
  const header = "Claim,Status,Source,Time\n";
  const rows = items
    .map((i) => `"${i.claim.replace(/"/g, '""')}",${STATUS_LABEL[i.status]},${i.source},${formatRelativeTime(i)}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "healthclaim-history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [items, setItems] = useState<HistoryItem[]>(HISTORY);

  useEffect(() => {
    chrome.storage?.local?.get<{ history?: HistoryItem[] }>("history").then((stored) => {
      if (stored?.history?.length) setItems(stored.history);
    });
  }, []);

  const filtered = items.filter((h) => {
    if (activeFilter === "All") return true;
    return STATUS_LABEL[h.status].toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div
      className="relative w-full max-w-[880px] overflow-hidden rounded-[20px]"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F3FBFA 100%)",
        border: "1px solid rgba(32,178,170,0.16)",
        boxShadow: "0 24px 60px -20px rgba(11,31,58,0.18), 0 4px 14px rgba(11,31,58,0.05)",
      }}
    >
      <div
        aria-hidden="true"
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(90deg, #20B2AA, #3ED6C9)" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-[18px]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-[30px] h-[30px] flex items-center justify-center rounded-full transition-colors"
            style={{ border: "1px solid rgba(11,31,58,0.12)", color: "#8a8a86" }}
            aria-label="Back"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 2.5L3 6l4.5 3.5" />
            </svg>
          </button>
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center overflow-hidden"
            style={{ background: "linear-gradient(135deg, #3ED6C9, #20B2AA 60%, #178F88)" }}
          >
            <svg width="18" height="10" viewBox="0 0 92 48" fill="none">
              <polyline points="0,24 16,24 22,10 28,38 34,4 40,24 92,24" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <div>
            <h2 className="font-fraunces text-[17px] font-semibold text-[#0B1F3A] leading-none">
              Claim history
            </h2>
            <p className="font-inter text-[11.5px] mt-[3px]" style={{ color: "#9a988e" }}>
              {items.length} claims analyzed
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div
          className="flex gap-1.5 rounded-full p-1"
          style={{ background: "#F3FBFA", border: "1px solid rgba(32,178,170,0.14)" }}
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-3.5 py-1.5 rounded-full font-inter text-[11.5px] transition-all duration-150"
              style={
                activeFilter === f
                  ? { background: "#20B2AA", color: "#FFFFFF", fontWeight: 600 }
                  : { color: "#6b6a63", fontWeight: 500 }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid px-6 py-2"
        style={{
          gridTemplateColumns: "2.3fr 0.9fr 1.1fr 0.8fr",
          gap: "28px",
          borderTop: "1px solid rgba(11,31,58,0.07)",
          borderBottom: "1px solid rgba(11,31,58,0.07)",
        }}
      >
        {["Claim", "Status", "Source", "Date"].map((col) => (
          <span
            key={col}
            className="font-inter text-[9.5px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "#9a988e" }}
          >
            {col}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div>
        {filtered.map((item, i) => (
          <div
            key={item.id}
            className="grid px-6 py-3.5 items-center transition-colors hover:bg-[#0B1F3A]/[0.02]"
            style={{
              gridTemplateColumns: "2.3fr 0.9fr 1.1fr 0.8fr",
              gap: "28px",
              borderBottom: i === filtered.length - 1 ? "none" : "1px solid rgba(11,31,58,0.05)",
            }}
          >
            <p className="font-fraunces text-[13.5px] text-[#0B1F3A] leading-[1.42] line-clamp-2">
              {item.claim}
            </p>
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full flex-none inline-block"
                style={{ background: STATUS_DOT[item.status] }}
              />
              <span className="font-inter text-[12px] font-semibold" style={{ color: STATUS_TEXT[item.status] }}>
                {STATUS_LABEL[item.status]}
              </span>
            </div>
            {isValidUrl(item.source) ? (
              <a
                href={item.source}
                target="_blank"
                rel="noopener noreferrer"
                className="font-inter text-[12px] overflow-hidden text-ellipsis whitespace-nowrap transition-colors hover:underline"
                style={{ color: "#178F88", minWidth: 0 }}
                title={item.source}
              >
                {formatSource(item.source)}
              </a>
            ) : (
              <span
                className="font-inter text-[12px] overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ color: "#9a988e", minWidth: 0 }}
                title={item.source}
              >
                {formatSource(item.source)}
              </span>
            )}
            <span className="font-inter text-[12px]" style={{ color: "#9a988e" }}>
              {formatRelativeTime(item)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-6 py-[14px] mt-2"
        style={{ borderTop: "1px solid rgba(32,178,170,0.12)" }}
      >
        <span className="font-inter text-[11px]" style={{ color: "#b0b0aa" }}>
          Powered by HealthClaim AI · Clinical evidence sources only
        </span>
        <button
          onClick={() => exportCsv(filtered)}
          className="font-inter text-[11.5px] font-semibold flex items-center gap-1.5"
          style={{ color: "#178F88" }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v8m0 0-3-3m3 3 3-3M3 13h10" />
          </svg>
          Export CSV
        </button>
      </div>
    </div>
  );
}

// ── Demo nav ──────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Screen; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "loading", label: "Loading" },
  { id: "result-supported", label: "Result · Supported" },
  { id: "result-harmful", label: "Result · Harmful" },
  { id: "history", label: "History Dashboard" },
];

function DemoNav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-7">
      {NAV_ITEMS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setScreen(id)}
          className="px-3 py-1.5 rounded-lg font-inter text-[11px] border transition-all duration-150"
          style={
            screen === id
              ? { borderColor: "rgba(32,178,170,0.45)", color: "#20B2AA", background: "rgba(32,178,170,0.1)" }
              : { borderColor: "rgba(11,31,58,0.1)", color: "rgba(11,31,58,0.38)", background: "transparent" }
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Reads the user's current text selection from the active tab. Returns ""
// if nothing is selected, the tab has no id (e.g. a chrome:// page), or the
// page doesn't allow script injection.
async function getSelectedTextFromActiveTab(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return "";
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString().trim() ?? "",
    });
    return (result ?? "").trim();
  } catch {
    return "";
  }
}

// ── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [claim, setClaim] = useState("");
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string; retryLabel: string } | null>(null);

  const handleVerify = async () => {
    setScreen("loading");
    try {
      const selected = await getSelectedTextFromActiveTab();
      if (!selected) {
        setErrorInfo({
          title: "No text selected",
          message: "Highlight a health claim on the page, then click Verify health claim again.",
          retryLabel: "Got it",
        });
        setScreen("error");
        return;
      }

      const data = await verifyClaim(selected);
      setClaim(selected);
      setResult(data);
      chrome.storage?.local?.set({ lastResult: data });
      saveToHistory(selected, data);
      const isHarmful = data.verdict === "Potentially Harmful" || data.verdict === "Insufficient Evidence";
      setScreen(isHarmful ? "result-harmful" : "result-supported");
    } catch {
      setErrorInfo(null);
      setScreen("error");
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center py-6 px-5"
      style={{ background: "#EAF6F4" }}
    >
      {screen === "home" && <HomeScreen onVerify={handleVerify} onViewHistory={() => chrome.tabs.create({ url: chrome.runtime.getURL("history.html") })} />}
      {screen === "loading" && <LoadingScreen />}
      {screen === "result-supported" && (
        result && <ResultScreen result={result} claim={claim} onClose={() => setScreen("home")} />
      )}
      {screen === "result-harmful" && (
        result && <ResultScreen result={result} claim={claim} onClose={() => setScreen("home")} />
      )}
      {screen === "error" && (
        <ErrorScreen
          onRetry={() => {
            setErrorInfo(null);
            setScreen("home");
          }}
          {...(errorInfo ?? {})}
        />
      )}
    </div>
  );
}