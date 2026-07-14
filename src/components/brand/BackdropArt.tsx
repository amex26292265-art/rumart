/**
 * Premium abstract backdrop — soft monochrome gradient blobs + fine grid.
 * Pure SVG/CSS, no stock imagery. Sits behind the hero and section headers.
 */
export function BackdropArt({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 dot-grid opacity-60" />
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="rm-blob-a" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e9e9ec" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rm-blob-b" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dbe4ff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="18%" cy="12%" r="260" fill="url(#rm-blob-a)" className="animate-float-slow" />
        <circle cx="82%" cy="30%" r="220" fill="url(#rm-blob-b)" />
        <circle cx="60%" cy="-6%" r="180" fill="url(#rm-blob-a)" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-white" />
    </div>
  );
}
