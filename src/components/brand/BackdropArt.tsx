/**
 * Dark cyber backdrop — static glow orbs (no animated blur/particles).
 * Animated filter:blur was a major main-thread / GPU cost on every page with a hero.
 */
export function BackdropArt({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.22),_transparent_55%)]" />
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-accent-600/25 blur-3xl" />
      <div className="absolute -right-16 top-32 h-80 w-80 rounded-full bg-accent-400/15 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-900/30 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" />
    </div>
  );
}
