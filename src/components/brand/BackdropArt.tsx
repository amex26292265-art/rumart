/**
 * Dark cyber backdrop — violet glow orbs, grid, floating particles.
 */
export function BackdropArt({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.22),_transparent_55%)]" />
      <div className="absolute inset-0 dot-grid opacity-40" />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-accent-600/30 blur-3xl animate-pulse-glow" />
      <div className="absolute -right-16 top-32 h-80 w-80 rounded-full bg-accent-400/20 blur-3xl animate-float-slow" />
      <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-900/40 blur-3xl" />
      <svg className="absolute inset-0 h-full w-full opacity-30" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rm-grid-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#07070b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#rm-grid-fade)" />
      </svg>
      {/* Soft particle dots */}
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-accent-400/70 animate-particle"
          style={{
            left: `${8 + ((i * 7) % 84)}%`,
            bottom: `${(i * 11) % 40}%`,
            animationDelay: `${i * 1.2}s`,
            animationDuration: `${14 + (i % 5) * 2}s`,
          }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" />
    </div>
  );
}
