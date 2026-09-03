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
    <div className="relative w-[360px] h-[600px] bg-[#FAFAF7] overflow-hidden flex flex-col items-center justify-center select-none rounded-2xl" style={{ boxShadow: "0 1px 2px rgba(11,31,58,0.04), 0 12px 32px -8px rgba(11,31,58,0.14), 0 24px 64px -16px rgba(11,31,58,0.10)", border: "1px solid rgba(11,31,58,0.06)" }}>
      <GrainLayer />

      <button
        onClick={onViewHistory}
        className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
        style={{ border: "1px solid rgba(11,31,58,0.1)", color: "rgba(11,31,58,0.4)", zIndex: 61 }}
        aria-label="View history"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.5V8l2.5 1.5" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Background linework illustration */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 360 600"
        fill="none"
        stroke="#0B1F3A"
        strokeWidth="0.75"
        opacity="0.045"
      >
        {/* Phone */}
        <rect x="112" y="58" width="92" height="158" rx="10" />
        <line x1="112" y1="84" x2="204" y2="84" />
        <line x1="112" y1="200" x2="204" y2="200" />
        <circle cx="158" cy="213" r="5" />
        <line x1="124" y1="98" x2="180" y2="98" />
        <line x1="124" y1="108" x2="162" y2="108" />
        <rect x="124" y="118" width="58" height="42" rx="3" />
        <line x1="124" y1="170" x2="180" y2="170" />
        <line x1="124" y1="180" x2="156" y2="180" />
        {/* Film reel */}
        <rect x="52" y="295" width="256" height="160" rx="6" />
        <circle cx="108" cy="375" r="35" />
        <circle cx="108" cy="375" r="16" />
        <circle cx="108" cy="375" r="5" />
        <circle cx="252" cy="375" r="35" />
        <circle cx="252" cy="375" r="16" />
        <circle cx="252" cy="375" r="5" />
        <line x1="143" y1="375" x2="217" y2="375" />
        <rect x="52" y="298" width="9" height="9" rx="1.5" />
        <rect x="52" y="314" width="9" height="9" rx="1.5" />
        <rect x="52" y="330" width="9" height="9" rx="1.5" />
        <rect x="299" y="298" width="9" height="9" rx="1.5" />
        <rect x="299" y="314" width="9" height="9" rx="1.5" />
        <rect x="299" y="330" width="9" height="9" rx="1.5" />
        {/* Social cards */}
        <rect x="36" y="478" width="118" height="80" rx="6" />
        <rect x="206" y="478" width="118" height="80" rx="6" />
        <circle cx="50" cy="494" r="7" />
        <line x1="62" y1="492" x2="138" y2="492" />
        <line x1="62" y1="498" x2="118" y2="498" />
        <rect x="48" y="508" width="96" height="38" rx="3" />
        <circle cx="220" cy="494" r="7" />
        <line x1="232" y1="492" x2="308" y2="492" />
        <line x1="232" y1="498" x2="288" y2="498" />
        <rect x="218" y="508" width="96" height="38" rx="3" />
      </svg>

      {/* Ambient top glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(45,212,191,0.28), transparent)" }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-5 px-8" style={{ zIndex: 60 }}>
        {/* Logo glow */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute w-24 h-24 rounded-full blur-3xl"
            style={{ background: "rgba(45,212,191,0.14)" }}
          />
          <div
            className="relative p-3.5 rounded-[18px]"
            style={{
              background: "rgba(45,212,191,0.06)",
              border: "1px solid rgba(45,212,191,0.2)",
            }}
          >
            <ShieldLogo size={46} />
          </div>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center gap-1.5">
          <h1
            className="font-fraunces text-[30px] font-semibold text-[#0B1F3A] leading-none"
            style={{ letterSpacing: "-0.025em" }}
          >
            HealthClaim
          </h1>
          <p
            className="font-fraunces text-[13.5px] italic text-[#2DD4BF]"
            style={{ opacity: 0.72, letterSpacing: "0.01em" }}
          >
            Verify before you follow.
          </p>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-3 w-full max-w-[200px]">
          <div className="flex-1 h-px" style={{ background: "rgba(11,31,58,0.1)" }} />
          <div className="w-1 h-1 rounded-full" style={{ background: "rgba(45,212,191,0.4)" }} />
          <div className="flex-1 h-px" style={{ background: "rgba(11,31,58,0.1)" }} />
        </div>

        {/* Subtext */}
        <p
          className="text-center font-inter text-[12px] text-[#0B1F3A] leading-relaxed max-w-[200px]"
          style={{ opacity: 0.38 }}
        >
          AI-powered evidence review for health claims found on social media and the web.
        </p>

        {/* CTA */}
        <button
          onClick={onVerify}
          className="cta-glow mt-1 px-8 py-3.5 rounded-full font-inter font-medium text-[13px] text-[#0B1F3A] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #2DD4BF 0%, #5eead4 100%)",
            letterSpacing: "0.025em",
          }}
        >
          Verify Health Claim
        </button>
      </div>

      {/* Bottom hint */}
      <div
        className="absolute bottom-5 flex items-center gap-2"
        style={{ opacity: 0.22, zIndex: 60 }}
      >
        <div className="w-5 h-px bg-[#0B1F3A]" />
        <span className="font-inter text-[9px] text-[#0B1F3A] tracking-[0.16em] uppercase">
          Select text to analyze
        </span>
        <div className="w-5 h-px bg-[#0B1F3A]" />
      </div>

      {/* Bottom hairline */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(45,212,191,0.18), transparent)" }}
      />
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
const RESULT_DATA = {
  supported: {
    claim: `"Dark chocolate may reduce cardiovascular disease risk when consumed in moderation."`,
    status: "Supported" as const,
    pillCls: "bg-emerald-50 text-emerald-700",
    pillBorder: "rgba(16,185,129,0.35)",
    barFrom: "#10b981",
    barTo: "#34d399",
    barWidth: "84%",
    borderColor: "rgba(52,211,153,0.55)",
    accentText: "#34d399",
    evidenceSummary:
      "Multiple randomized controlled trials and meta-analyses support a modest cardioprotective effect from flavonoid-rich dark chocolate at 20–40g per day. Effect sizes are real but modest, and confounding factors remain.",
    whyText:
      "While the underlying data is sound, popular media overstates portion guidance and ignores the confounding sugar content in commercial products, creating a license to overconsume that the evidence doesn't support.",
    sources: [
      { icon: "⚗️", name: "NEJM", type: "Randomized Trial", strength: "High" },
      { icon: "📊", name: "Cochrane", type: "Meta-analysis", strength: "High" },
      { icon: "📄", name: "BMJ", type: "Cohort Study", strength: "Moderate" },
    ],
  },
  harmful: {
    claim: `"Drinking bleach in small doses eliminates cancer cells and boosts immunity."`,
    status: "Potentially Harmful" as const,
    pillCls: "bg-rose-50 text-rose-700",
    pillBorder: "rgba(244,63,94,0.3)",
    barFrom: "#be123c",
    barTo: "#fb7185",
    barWidth: "5%",
    borderColor: "rgba(251,113,133,0.55)",
    accentText: "#fb7185",
    evidenceSummary:
      "No credible clinical or preclinical evidence supports this claim. Bleach ingestion causes severe mucosal injury and systemic toxicity — potentially fatal even in trace amounts according to WHO and CDC toxicology reports.",
    whyText:
      "This claim circulates primarily on fringe wellness platforms, exploiting fear of conventional cancer treatment. It has no basis in published biomedical literature and directly contradicts fundamental toxicology principles.",
    sources: [
      { icon: "🏥", name: "WHO", type: "Safety Bulletin", strength: "High" },
      { icon: "⚠️", name: "CDC", type: "Toxicology Report", strength: "High" },
      { icon: "🔬", name: "NIH MedlinePlus", type: "Clinical Guideline", strength: "High" },
    ],
  },
};

function ResultScreen({
  variant,
  onClose,
}: {
  variant: "supported" | "harmful";
  onClose: () => void;
}) {
  const [accordionOpen, setAccordionOpen] = useState(false);
  const d = RESULT_DATA[variant];
  const isHarmful = variant === "harmful";

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
            {d.claim}
          </p>
        </div>

        {/* Status + confidence */}
        <div className="flex flex-col gap-2">
          <span
            className={`self-start px-3 py-1 rounded-full font-inter text-[11px] font-medium ${d.pillCls}`}
            style={{ border: `1px solid ${d.pillBorder}` }}
          >
            {d.status}
          </span>
          <div
            className="h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(11,31,58,0.07)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: d.barWidth,
                background: `linear-gradient(90deg, ${d.barFrom}, ${d.barTo})`,
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
          style={{ borderLeft: `2px solid ${d.borderColor}` }}
        >
          <p
            className="font-inter text-[9px] font-medium uppercase tracking-[0.13em] mb-2"
            style={{ color: d.accentText, opacity: 0.75 }}
          >
            What Evidence Says
          </p>
          <p
            className="font-inter text-[12px] text-[#0B1F3A] leading-[1.72]"
            style={{ opacity: 0.62 }}
          >
            {d.evidenceSummary}
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
                {d.whyText}
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
            {d.sources.map((src, i) => (
              <div
                key={i}
                className="flex-none w-32 rounded-xl p-3 flex flex-col gap-2.5"
                style={{
                  background: "rgba(11,31,58,0.03)",
                  border: "1px solid rgba(11,31,58,0.08)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[16px] leading-none">{src.icon}</span>
                  <div className={`w-2 h-2 rounded-full ${STRENGTH_DOT[src.strength]}`} />
                </div>
                <div>
                  <p
                    className="font-inter text-[12px] font-medium text-[#0B1F3A] leading-none mb-1.5"
                    style={{ opacity: 0.82 }}
                  >
                    {src.name}
                  </p>
                  <span
                    className="inline-block px-1.5 py-0.5 rounded-md font-inter text-[9px] text-[#0B1F3A] tracking-[0.04em]"
                    style={{ background: "rgba(11,31,58,0.07)", opacity: 0.7 }}
                  >
                    {src.type}
                  </span>
                </div>
                <p
                  className="font-inter text-[9px] text-[#0B1F3A]"
                  style={{ opacity: 0.3 }}
                >
                  {src.strength}
                </p>
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

  const handleVerify = async () => {
    setScreen("loading");
    try {
      const data = await verifyClaim("sample claim text");
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
      className="min-h-full flex flex-col items-center justify-center py-12 px-6"
      style={{ background: "#EFEBE2" }}
    >

            {screen === "home" && <HomeScreen onVerify={handleVerify} onViewHistory={() => chrome.tabs.create({ url: chrome.runtime.getURL("history.html") })} />}
      {screen === "loading" && <LoadingScreen />}
      {screen === "result-supported" && (
        <ResultScreen variant="supported" onClose={() => setScreen("home")} />
      )}
      {screen === "result-harmful" && (
        <ResultScreen variant="harmful" onClose={() => setScreen("home")} />
      )}
      {screen === "error" && <ErrorScreen onRetry={() => setScreen("home")} />}
    </div>
  );
}
