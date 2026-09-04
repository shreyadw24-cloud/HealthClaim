import { useState, useEffect } from "react";

type Screen = "home" | "loading" | "result-supported" | "result-harmful" | "history" | "error";

// ── API ──────────────────────────────────────────────────────────────────────
type VerifyResult = {
  verdict: "Supported" | "Partially Supported" | "Insufficient Evidence" | "Potentially Harmful";
  harmLevel: "Low" | "Medium" | "High";
  explanation: string;
  sources: { name: string; url: string }[];
};

async function verifyClaim(claim: string): Promise<VerifyResult> {
  // TODO: uncomment when backend is live, remove the mock below
  // const res = await fetch(`${import.meta.env.VITE_API_URL}/verify-claim`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ claim }),
  // });
  // if (!res.ok) throw new Error("Verification failed");
  // return res.json();

  await new Promise((r) => setTimeout(r, 3000));
  return {
    verdict: "Potentially Harmful",
    harmLevel: "High",
    explanation: "No credible clinical or preclinical evidence supports this claim.",
    sources: [{ name: "WHO", url: "https://who.int" }],
  };
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
  High: "bg-[#2DD4BF]",
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

// ── Shield + pulse logo ──────────────────────────────────────────────────────
function ShieldLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="HealthClaim shield logo">
      <path
        d="M20 3L5.5 9.5V22C5.5 30 11.8 37 20 39C28.2 37 34.5 30 34.5 22V9.5L20 3Z"
        fill="rgba(45,212,191,0.11)"
        stroke="#2DD4BF"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 21H14L16 15L18.5 27.5L20.5 17L22.2 22L24 21H31"
        stroke="#2DD4BF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Error ─────────────────────────────────────────────────────────────────────
function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="relative w-[360px] h-[600px] bg-[#FAFAF7] overflow-hidden flex flex-col items-center justify-center gap-5 rounded-2xl"
      style={{ boxShadow: "0 1px 2px rgba(11,31,58,0.04), 0 12px 32px -8px rgba(11,31,58,0.14), 0 24px 64px -16px rgba(11,31,58,0.10)", border: "1px solid rgba(11,31,58,0.06)" }}
    >
      <GrainLayer />
      <div className="relative flex flex-col items-center gap-5" style={{ zIndex: 60 }}>
        <div style={{ opacity: 0.55 }}>
          <ShieldLogo size={40} />
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center px-10">
          <h2
            className="font-fraunces text-[18px] font-medium text-[#0B1F3A]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Couldn't verify this claim
          </h2>
          <p className="font-inter text-[12px] text-[#0B1F3A]" style={{ opacity: 0.45 }}>
            Something went wrong while checking the evidence. Please try again.
          </p>
        </div>
        <button
          onClick={onRetry}
          className="mt-1 px-5 py-2.5 rounded-full font-inter text-[12px] font-medium transition-all duration-150"
          style={{ background: "#0B1F3A", color: "#FAFAF7" }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ── Home ─────────────────────────────────────────────────────────────────────
function HomeScreen({ onVerify, onViewHistory }: { onVerify: () => void; onViewHistory: () => void }) {
  return (
    <div
      className="relative w-[340px] overflow-hidden flex flex-col rounded-[22px]"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F3FBFA 100%)",
        border: "1px solid rgba(32,178,170,0.16)",
        boxShadow: "0 24px 60px -20px rgba(11,31,58,0.22), 0 4px 14px rgba(11,31,58,0.05)",
      }}
    >
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #20B2AA, #3ED6C9)" }} />

      <div className="flex items-center justify-between" style={{ padding: "16px 18px 0" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#20B2AA" }} />
          <span className="font-inter text-[10px] uppercase" style={{ letterSpacing: "0.14em", color: "#8A8A86" }}>
            Trusted evidence
          </span>
        </div>
        <button onClick={onViewHistory} aria-label="View history" style={{ color: "#B0B0AA" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.8 8A5.2 5.2 0 1 1 4.4 11.8" />
            <path d="M2.8 5.2V8H5.6" />
            <path d="M8 5.2V8l2.1 1.3" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col items-center" style={{ padding: "22px 30px 26px" }}>
        <div
          className="relative flex items-center justify-center mb-4"
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "radial-gradient(circle at 30% 25%, #3ED6C9, #20B2AA 60%, #178F88 100%)",
            boxShadow: "0 14px 26px -8px rgba(32,178,170,0.5)",
          }}
        >
          <div className="absolute" style={{ inset: -6, borderRadius: 26, border: "1px solid rgba(32,178,170,0.18)" }} />
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
            <path d="M20 3L5.5 9.5V22C5.5 30 11.8 37 20 39C28.2 37 34.5 30 34.5 22V9.5L20 3Z" fill="rgba(255,255,255,0.12)" stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M9 21H14L16 15L18.5 27.5L20.5 17L22.2 22L24 21H31" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="font-fraunces" style={{ fontSize: 26, fontWeight: 600, color: "#0B1F3A", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          HealthClaim
        </h1>
        <p className="font-fraunces italic" style={{ fontSize: 13, color: "#178F88", margin: "0 0 16px", letterSpacing: "0.01em" }}>
          Verify before you follow.
        </p>

        <div className="flex items-center gap-2.5 w-full mb-4" style={{ maxWidth: 190 }}>
          <div className="flex-1 h-px" style={{ background: "rgba(11,31,58,0.12)" }} />
          <div className="w-1 h-1 rounded-full" style={{ background: "#20B2AA" }} />
          <div className="flex-1 h-px" style={{ background: "rgba(11,31,58,0.12)" }} />
        </div>

        <p className="text-center" style={{ fontSize: 12.5, color: "#6B6A63", lineHeight: 1.6, maxWidth: 230, margin: "0 0 22px" }}>
          AI-powered evidence review for health claims found on social media and the web.
        </p>

        <button
          onClick={onVerify}
          className="w-full flex items-center justify-center gap-2"
          style={{
            padding: "14px 0",
            border: "none",
            borderRadius: 14,
            background: "linear-gradient(135deg, #3ED6C9, #20B2AA 55%, #178F88)",
            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: 13.5,
            letterSpacing: "0.02em",
            boxShadow: "0 12px 24px -8px rgba(32,178,170,0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
            <path d="M9 12l2 2l4 -4" />
          </svg>
          Verify health claim
        </button>

        <div className="flex items-center gap-3 mt-5" style={{ opacity: 0.6 }}>
          <span className="uppercase" style={{ fontSize: 9.5, letterSpacing: "0.08em", color: "#0B1F3A" }}>Evidence from</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#0B1F3A" }}>WHO</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#0B1F3A" }}>CDC</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#0B1F3A" }}>NIH</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#0B1F3A" }}>PubMed</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2" style={{ borderTop: "1px solid rgba(32,178,170,0.1)", padding: "12px 0" }}>
        <div className="w-4 h-px" style={{ background: "rgba(11,31,58,0.18)" }} />
        <span className="uppercase" style={{ fontSize: 9, letterSpacing: "0.14em", color: "#B0B0AA" }}>Select text to analyze</span>
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
    <div className="relative w-[360px] h-[600px] bg-[#FAFAF7] overflow-hidden flex flex-col items-center justify-center rounded-2xl" style={{ boxShadow: "0 1px 2px rgba(11,31,58,0.04), 0 12px 32px -8px rgba(11,31,58,0.14), 0 24px 64px -16px rgba(11,31,58,0.10)", border: "1px solid rgba(11,31,58,0.06)" }}>
      <GrainLayer />
      <div className="relative flex flex-col items-center gap-9" style={{ zIndex: 60 }}>
        {/* Pulsing rings */}
        <div className="relative flex items-center justify-center">
          <div
            className="ring-pulse-outer absolute w-32 h-32 rounded-full"
            style={{ border: "1px solid rgba(45,212,191,0.18)" }}
          />
          <div
            className="ring-pulse-mid absolute w-22 h-22 rounded-full"
            style={{
              width: "88px",
              height: "88px",
              border: "1px solid rgba(45,212,191,0.28)",
            }}
          />
          <div
            className="ring-pulse-inner w-16 h-16 rounded-full flex items-center justify-center"
            style={{ border: "1.5px solid rgba(45,212,191,0.65)" }}
          >
            <ShieldLogo size={26} />
          </div>
        </div>

        {/* Fading message */}
        <p
          className="font-fraunces text-[15px] italic text-[#0B1F3A] transition-opacity duration-300"
          style={{ opacity: fade ? 0.6 : 0, letterSpacing: "0.01em" }}
        >
          {LOADING_MSGS[msgIdx]}
        </p>

        {/* Step dots */}
        <div className="flex gap-2">
          {LOADING_MSGS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-400"
              style={{
                width: i === msgIdx ? "16px" : "4px",
                height: "4px",
                background: i === msgIdx ? "#2DD4BF" : "rgba(45,212,191,0.2)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Result ───────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<VerifyResult["verdict"], { pillCls: string; pillBorder: string; barFrom: string; barTo: string; barWidth: string; borderColor: string; accentText: string }> = {
  Supported: {
    pillCls: "bg-emerald-50 text-emerald-700",
    pillBorder: "rgba(16,185,129,0.35)",
    barFrom: "#10b981",
    barTo: "#34d399",
    barWidth: "88%",
    borderColor: "rgba(52,211,153,0.55)",
    accentText: "#34d399",
  },
  "Partially Supported": {
    pillCls: "bg-amber-50 text-amber-700",
    pillBorder: "rgba(217,119,6,0.3)",
    barFrom: "#d97706",
    barTo: "#fbbf24",
    barWidth: "58%",
    borderColor: "rgba(251,191,36,0.55)",
    accentText: "#fbbf24",
  },
  "Insufficient Evidence": {
    pillCls: "bg-slate-100 text-slate-600",
    pillBorder: "rgba(100,116,139,0.3)",
    barFrom: "rgba(11,31,58,0.4)",
    barTo: "rgba(11,31,58,0.2)",
    barWidth: "35%",
    borderColor: "rgba(11,31,58,0.3)",
    accentText: "rgba(11,31,58,0.5)",
  },
  "Potentially Harmful": {
    pillCls: "bg-rose-50 text-rose-700",
    pillBorder: "rgba(244,63,94,0.3)",
    barFrom: "#be123c",
    barTo: "#fb7185",
    barWidth: "8%",
    borderColor: "rgba(251,113,133,0.55)",
    accentText: "#fb7185",
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
    <div className="relative w-[360px] h-[600px] bg-[#FAFAF7] overflow-hidden flex flex-col rounded-2xl" style={{ boxShadow: "0 1px 2px rgba(11,31,58,0.04), 0 12px 32px -8px rgba(11,31,58,0.14), 0 24px 64px -16px rgba(11,31,58,0.10)", border: "1px solid rgba(11,31,58,0.06)" }}>
      <GrainLayer />

      {/* Header */}
      <div
        className="relative flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid rgba(11,31,58,0.07)", zIndex: 60 }}
      >
        <div className="flex items-center gap-2">
          <ShieldLogo size={22} />
          <span className="font-fraunces text-[13px] text-[#0B1F3A]" style={{ opacity: 0.65 }}>
            HealthClaim
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
          style={{
            border: "1px solid rgba(11,31,58,0.1)",
            color: "rgba(11,31,58,0.35)",
          }}
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
            <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div
        className="relative flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-4"
        style={{ zIndex: 60 }}
      >
        {/* Claim card */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(11,31,58,0.03)",
            border: "1px solid rgba(11,31,58,0.09)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="font-inter text-[9px] font-medium text-[#0B1F3A] tracking-[0.14em] uppercase"
              style={{ opacity: 0.32 }}
            >
              Claim Detected
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(11,31,58,0.07)" }} />
          </div>
          <p className="font-fraunces text-[15px] font-medium text-[#0B1F3A] leading-[1.55]" style={{ opacity: 0.88 }}>
            {claim}
          </p>
        </div>

        {/* Status + confidence */}
        <div className="flex flex-col gap-2">
          <span
            className={`self-start px-3 py-1 rounded-full font-inter text-[11px] font-medium ${s.pillCls}`}
            style={{ border: `1px solid ${s.pillBorder}` }}
          >
            {result.verdict}
          </span>
          <div
            className="h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(11,31,58,0.07)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: s.barWidth,
                background: `linear-gradient(90deg, ${s.barFrom}, ${s.barTo})`,
              }}
            />
          </div>
          <span
            className="font-inter text-[9.5px] text-[#0B1F3A] tracking-[0.06em]"
            style={{ opacity: 0.28 }}
          >
            Evidence confidence
          </span>
        </div>

        {/* What Evidence Says */}
        <div
          className="pl-3"
          style={{ borderLeft: `2px solid ${s.borderColor}` }}
        >
          <p
            className="font-inter text-[9px] font-medium uppercase tracking-[0.13em] mb-2"
            style={{ color: s.accentText, opacity: 0.75 }}
          >
            What Evidence Says
          </p>
          <p
            className="font-inter text-[12px] text-[#0B1F3A] leading-[1.72]"
            style={{ opacity: 0.62 }}
          >
            {result.explanation}
          </p>
        </div>

        {/* Accordion */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(11,31,58,0.08)" }}
        >
          <button
            onClick={() => setAccordionOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#0B1F3A]/[0.03]"
          >
            <span
              className="font-inter text-[11px] font-medium text-[#0B1F3A] hover:underline"
              style={{ opacity: 0.48 }}
            >
              {isHarmful ? "Why is this harmful?" : "Nuances & Caveats"}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="rgba(11,31,58,0.3)"
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
            className="font-inter text-[9px] font-medium uppercase tracking-[0.13em] text-[#0B1F3A] mb-2.5"
            style={{ opacity: 0.3 }}
          >
            Evidence Sources
          </p>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-0.5">
            {result.sources.map((src, i) => (
              <div
                key={i}
                className="flex-none w-32 rounded-xl p-3 flex flex-col gap-2.5"
                style={{
                  background: "rgba(11,31,58,0.03)",
                  border: "1px solid rgba(11,31,58,0.08)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[16px] leading-none">🔗</span>
                  <div className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
                </div>
                <div>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-inter text-[12px] font-medium text-[#0B1F3A] leading-none mb-1.5 block hover:underline"
                    style={{ opacity: 0.82 }}
                  >
                    {src.name}
                  </a>
                  <span
                    className="inline-block px-1.5 py-0.5 rounded-md font-inter text-[9px] text-[#0B1F3A] tracking-[0.04em]"
                    style={{ background: "rgba(11,31,58,0.07)", opacity: 0.7 }}
                  >
                    Evidence Source
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk banner — harmful only */}
        {isHarmful && (
          <div
            className="rounded-xl p-3.5 flex items-start gap-3"
            style={{
              background: "rgba(244,63,94,0.08)",
              border: "1px solid rgba(244,63,94,0.22)",
            }}
          >
            <svg
              className="flex-none mt-0.5"
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              stroke="#be123c"
              strokeWidth="1.3"
              strokeLinecap="round"
            >
              <path d="M7.5 1.5L13.5 12.5H1.5L7.5 1.5Z" />
              <line x1="7.5" y1="5.5" x2="7.5" y2="9" />
              <circle cx="7.5" cy="11" r="0.6" fill="#be123c" />
            </svg>
            <p
              className="font-fraunces text-[12px] italic leading-[1.65]"
              style={{ color: "rgba(253,164,175,0.8)" }}
            >
              This claim describes a practice that poses serious health risks. Please consult a licensed medical professional before acting on any health information found online.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="relative flex items-center justify-around px-4 py-3"
        style={{ borderTop: "1px solid rgba(11,31,58,0.07)", zIndex: 60 }}
      >
        {footerButtons.map(({ tip, icon }) => (
          <div key={tip} className="relative group">
            <button
              className="flex flex-col items-center gap-1.5 px-3.5 py-2 rounded-xl border border-transparent transition-all duration-150 hover:border-[#0B1F3A]/10 hover:bg-[#0B1F3A]/[0.05]"
              style={{ color: "rgba(11,31,58,0.3)" }}
              aria-label={tip}
            >
              <span className="hover:text-[#0B1F3A]/70 transition-colors">{icon}</span>
              <span className="font-inter text-[9px] tracking-[0.04em]">{tip.split(" ")[0]}</span>
            </button>
            {/* Tooltip */}
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg font-inter text-[10px] whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{
                background: "#0d2545",
                border: "1px solid rgba(11,31,58,0.1)",
                color: "rgba(11,31,58,0.58)",
              }}
            >
              {tip}
            </div>
          </div>
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

const STATUS_DOT_CLS: Record<Status, string> = {
  supported: "bg-emerald-400",
  partial: "bg-amber-400",
  insufficient: "bg-orange-400",
  harmful: "bg-rose-400",
};
const STATUS_TEXT_CLS: Record<Status, string> = {
  supported: "text-emerald-600",
  partial: "text-amber-600",
  insufficient: "text-orange-600",
  harmful: "text-rose-600",
};
const STATUS_LABEL: Record<Status, string> = {
  supported: "Supported",
  partial: "Partial",
  insufficient: "Insufficient",
  harmful: "Harmful",
};

const FILTERS = ["All", "Supported", "Partial", "Harmful"] as const;
type Filter = typeof FILTERS[number];

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
      className="relative w-full max-w-[760px] overflow-hidden rounded-2xl"
      style={{ background: "#FAFAF7", border: "1px solid rgba(11,31,58,0.07)", boxShadow: "0 1px 2px rgba(11,31,58,0.04), 0 12px 32px -8px rgba(11,31,58,0.14), 0 24px 64px -16px rgba(11,31,58,0.10)" }}
    >
      <GrainLayer />

      {/* Header */}
      <div
        className="relative flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid rgba(11,31,58,0.07)", zIndex: 60 }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ border: "1px solid rgba(11,31,58,0.1)", color: "rgba(11,31,58,0.4)" }}
            aria-label="Back"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 2.5L3 6l4.5 3.5" />
            </svg>
          </button>
          <ShieldLogo size={26} />
          <div>
            <h2
              className="font-fraunces text-[17px] font-medium text-[#0B1F3A] leading-none"
              style={{ letterSpacing: "-0.02em", opacity: 0.9 }}
            >
              Claim History
            </h2>
            <p className="font-inter text-[11px] text-[#0B1F3A] mt-1" style={{ opacity: 0.32 }}>
              {items.length} claims analyzed
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-3 py-1.5 rounded-full font-inter text-[11px] border transition-all duration-150"
              style={
                activeFilter === f
                  ? {
                      borderColor: "rgba(45,212,191,0.4)",
                      color: "#2DD4BF",
                      background: "rgba(45,212,191,0.08)",
                    }
                  : {
                      borderColor: "rgba(11,31,58,0.09)",
                      color: "rgba(11,31,58,0.38)",
                      background: "transparent",
                    }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div
        className="relative grid px-6 py-2.5"
        style={{
          gridTemplateColumns: "1fr 120px 100px 88px",
          gap: "16px",
          borderBottom: "1px solid rgba(11,31,58,0.05)",
          zIndex: 60,
        }}
      >
        {["Claim", "Status", "Source", "Date"].map((col) => (
          <span
            key={col}
            className="font-inter text-[9px] font-medium uppercase tracking-[0.13em] text-[#0B1F3A]"
            style={{ opacity: 0.24 }}
          >
            {col}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="relative divide-y divide-[#0B1F3A]/[0.06]" style={{ zIndex: 60 }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            className="grid px-6 py-4 cursor-pointer group transition-colors hover:bg-[#0B1F3A]/[0.03]"
            style={{ gridTemplateColumns: "1fr 120px 100px 88px", gap: "16px" }}
          >
            <p
              className="font-fraunces text-[13.5px] text-[#0B1F3A] leading-[1.42] line-clamp-2 group-hover:opacity-85 transition-opacity"
              style={{ opacity: 0.65 }}
            >
              {item.claim}
            </p>
            <div className="flex items-center gap-2 self-start pt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-none ${STATUS_DOT_CLS[item.status]}`} />
              <span className={`font-inter text-[11px] ${STATUS_TEXT_CLS[item.status]}`}>
                {STATUS_LABEL[item.status]}
              </span>
            </div>
            <span className="font-inter text-[11px] text-[#0B1F3A] self-start pt-0.5" style={{ opacity: 0.28 }}>
              {item.source}
            </span>
            <span className="font-inter text-[11px] text-[#0B1F3A] self-start pt-0.5" style={{ opacity: 0.22 }}>
              {item.time}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="relative flex items-center justify-between px-6 py-4"
        style={{ borderTop: "1px solid rgba(11,31,58,0.07)", zIndex: 60 }}
      >
        <span className="font-inter text-[10px] text-[#0B1F3A]" style={{ opacity: 0.18 }}>
          Powered by HealthClaim AI · Clinical evidence sources only
        </span>
        <button
          className="font-inter text-[10px] transition-opacity"
          style={{ color: "rgba(45,212,191,0.48)" }}
        >
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
              ? { borderColor: "rgba(45,212,191,0.45)", color: "#2DD4BF", background: "rgba(45,212,191,0.1)" }
              : { borderColor: "rgba(11,31,58,0.1)", color: "rgba(11,31,58,0.38)", background: "transparent" }
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [claim, setClaim] = useState("");

  const handleVerify = async () => {
    setScreen("loading");
    try {
      const claimText = "sample claim text";
      const data = await verifyClaim(claimText);
      setClaim(claimText);
      setResult(data);
      chrome.storage?.local?.set({ lastResult: data });
      saveToHistory("sample claim text", data);
      const isHarmful = data.verdict === "Potentially Harmful" || data.verdict === "Insufficient Evidence";
      setScreen(isHarmful ? "result-harmful" : "result-supported");
    } catch {
      setScreen("error");
    }
  };

  return (
    <div
      className="flex flex-col items-center py-6"
      style={{ background: "#F3FBFA" }}
    >
      {screen === "home" && <HomeScreen onVerify={handleVerify} onViewHistory={() => chrome.tabs.create({ url: chrome.runtime.getURL("history.html") })} />}
      {screen === "loading" && <LoadingScreen />}
      {screen === "result-supported" && (
        result && <ResultScreen result={result} claim={claim} onClose={() => setScreen("home")} />
      )}
      {screen === "result-harmful" && (
        result && <ResultScreen result={result} claim={claim} onClose={() => setScreen("home")} />
      )}
      {screen === "error" && <ErrorScreen onRetry={() => setScreen("home")} />}
    </div>
  );
}