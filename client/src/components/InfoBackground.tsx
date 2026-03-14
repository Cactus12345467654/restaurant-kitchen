/**
 * Digitāli moderns fons Info lapai – mikroshēmas/mikroshēmas motīvi gar malām,
 * kustības efekti un viegls glow.
 */
export function InfoBackground() {
  return (
    <div className="info-page-bg pointer-events-none fixed inset-0 overflow-hidden">
      {/* Gradient mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.2),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_0%,hsl(var(--primary)/0.08),transparent)] dark:bg-[radial-gradient(ellipse_60%_40%_at_100%_0%,hsl(var(--primary)/0.12),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_0%_100%,hsl(var(--primary)/0.06),transparent)] dark:bg-[radial-gradient(ellipse_60%_40%_at_0%_100%,hsl(var(--primary)/0.1),transparent)]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Circuit board – augšējā kreisā mala */}
      <svg
        className="absolute left-0 top-0 h-48 w-48 text-primary/40 dark:text-primary/50"
        viewBox="0 0 120 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        <rect x="4" y="4" width="20" height="12" rx="1" className="info-circuit-pin" />
        <rect x="4" y="22" width="20" height="12" rx="1" className="info-circuit-pin" />
        <rect x="4" y="40" width="20" height="12" rx="1" className="info-circuit-pin" />
        <line x1="24" y1="10" x2="40" y2="10" className="info-circuit-line" />
        <line x1="24" y1="28" x2="50" y2="28" className="info-circuit-line" />
        <line x1="24" y1="46" x2="35" y2="46" className="info-circuit-line" />
        <circle cx="40" cy="10" r="2" className="info-circuit-node" />
        <circle cx="50" cy="28" r="2" className="info-circuit-node" />
        <rect x="45" y="6" width="18" height="8" rx="1" className="info-circuit-chip" />
        <line x1="63" y1="10" x2="75" y2="10" strokeDasharray="2 2" className="info-circuit-dash" />
      </svg>

      {/* Circuit board – augšējā labā mala */}
      <svg
        className="absolute right-0 top-0 h-48 w-48 text-primary/40 dark:text-primary/50"
        viewBox="0 0 120 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        style={{ transform: "scaleX(-1)" }}
      >
        <rect x="4" y="4" width="20" height="12" rx="1" className="info-circuit-pin" />
        <rect x="4" y="22" width="20" height="12" rx="1" className="info-circuit-pin" />
        <rect x="4" y="40" width="20" height="12" rx="1" className="info-circuit-pin" />
        <line x1="24" y1="10" x2="40" y2="10" className="info-circuit-line" />
        <line x1="24" y1="28" x2="50" y2="28" className="info-circuit-line" />
        <line x1="24" y1="46" x2="35" y2="46" className="info-circuit-line" />
        <circle cx="40" cy="10" r="2" className="info-circuit-node" />
        <circle cx="50" cy="28" r="2" className="info-circuit-node" />
        <rect x="45" y="6" width="18" height="8" rx="1" className="info-circuit-chip" />
        <line x1="63" y1="10" x2="75" y2="10" strokeDasharray="2 2" className="info-circuit-dash" />
      </svg>

      {/* Circuit board – apakšējā kreisā mala */}
      <svg
        className="absolute bottom-0 left-0 h-40 w-40 text-primary/35 dark:text-primary/45"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        style={{ transform: "rotate(-90deg) scaleX(-1)" }}
      >
        <rect x="4" y="4" width="16" height="10" rx="1" className="info-circuit-pin" />
        <rect x="4" y="20" width="16" height="10" rx="1" className="info-circuit-pin" />
        <line x1="20" y1="9" x2="35" y2="9" className="info-circuit-line" />
        <line x1="20" y1="25" x2="42" y2="25" className="info-circuit-line" />
        <circle cx="35" cy="9" r="1.5" className="info-circuit-node" />
        <circle cx="42" cy="25" r="1.5" className="info-circuit-node" />
        <rect x="38" y="5" width="14" height="8" rx="1" className="info-circuit-chip" />
      </svg>

      {/* Circuit board – apakšējā labā mala */}
      <svg
        className="absolute bottom-0 right-0 h-40 w-40 text-primary/35 dark:text-primary/45"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        style={{ transform: "rotate(90deg)" }}
      >
        <rect x="4" y="4" width="16" height="10" rx="1" className="info-circuit-pin" />
        <rect x="4" y="20" width="16" height="10" rx="1" className="info-circuit-pin" />
        <line x1="20" y1="9" x2="35" y2="9" className="info-circuit-line" />
        <line x1="20" y1="25" x2="42" y2="25" className="info-circuit-line" />
        <circle cx="35" cy="9" r="1.5" className="info-circuit-node" />
        <circle cx="42" cy="25" r="1.5" className="info-circuit-node" />
        <rect x="38" y="5" width="14" height="8" rx="1" className="info-circuit-chip" />
      </svg>

      {/* Signālu elementi – kreisā mala (vidus) */}
      <svg className="absolute left-0 top-[30%] h-24 w-24 text-primary/30 dark:text-primary/40" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="0.5">
        <rect x="4" y="8" width="14" height="8" rx="1" className="info-circuit-pin" />
        <line x1="18" y1="12" x2="35" y2="12" className="info-circuit-line" />
        <circle cx="35" cy="12" r="1.5" className="info-circuit-node" />
        <line x1="36.5" y1="12" x2="55" y2="12" strokeDasharray="2 2" className="info-circuit-dash" />
      </svg>
      <svg className="absolute left-0 top-[55%] h-20 w-20 text-primary/25 dark:text-primary/35" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="0.5">
        <rect x="4" y="12" width="12" height="6" rx="1" className="info-circuit-pin" />
        <line x1="16" y1="15" x2="40" y2="15" className="info-circuit-line" />
        <circle cx="40" cy="15" r="1" className="info-circuit-node" />
      </svg>

      {/* Signālu elementi – labā mala (vidus) */}
      <svg className="absolute right-0 top-[35%] h-20 w-20 text-primary/30 dark:text-primary/40" viewBox="0 0 70 70" fill="none" stroke="currentColor" strokeWidth="0.5" style={{ transform: "scaleX(-1)" }}>
        <rect x="4" y="10" width="12" height="6" rx="1" className="info-circuit-pin" />
        <line x1="16" y1="13" x2="45" y2="13" strokeDasharray="2 2" className="info-circuit-dash" />
        <circle cx="45" cy="13" r="1.5" className="info-circuit-node" />
      </svg>
      <svg className="absolute right-0 top-[65%] h-16 w-16 text-primary/25 dark:text-primary/35" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="0.5" style={{ transform: "scaleX(-1)" }}>
        <rect x="4" y="8" width="10" height="6" rx="1" className="info-circuit-pin" />
        <line x1="14" y1="11" x2="35" y2="11" className="info-circuit-line" />
      </svg>

      {/* Signālu elementi – augšā un apakšā vidū */}
      <svg className="absolute left-1/2 top-0 h-14 w-14 text-primary/20 dark:text-primary/30" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="0.5" style={{ transform: "translateX(-50%) rotate(90deg)" }}>
        <rect x="4" y="10" width="8" height="5" rx="1" className="info-circuit-pin" />
        <line x1="12" y1="12.5" x2="28" y2="12.5" strokeDasharray="2 2" className="info-circuit-dash" />
      </svg>
      <svg className="absolute left-[38%] bottom-8 h-12 w-12 text-primary/20 dark:text-primary/28" viewBox="0 0 35 35" fill="none" stroke="currentColor" strokeWidth="0.5" style={{ transform: "rotate(-90deg)" }}>
        <rect x="4" y="8" width="6" height="4" rx="1" className="info-circuit-pin" />
        <line x1="10" y1="10" x2="25" y2="10" className="info-circuit-line" />
      </svg>
      <svg className="absolute right-[38%] bottom-12 h-12 w-12 text-primary/20 dark:text-primary/28" viewBox="0 0 35 35" fill="none" stroke="currentColor" strokeWidth="0.5" style={{ transform: "rotate(90deg) scaleX(-1)" }}>
        <rect x="4" y="8" width="6" height="4" rx="1" className="info-circuit-pin" />
        <line x1="10" y1="10" x2="25" y2="10" strokeDasharray="2 2" className="info-circuit-dash" />
      </svg>

      {/* Animated data flow – vertikālas līnijas */}
      <div className="info-flow-line info-flow-1" />
      <div className="info-flow-line info-flow-2" />
      <div className="info-flow-line info-flow-3" />
      <div className="info-flow-line info-flow-4" />
    </div>
  );
}
