import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Coming soon",
  description: "Rumart by Velexis is preparing to launch. The marketplace is not public yet.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#07060d] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124, 58, 237, 0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(14, 165, 233, 0.12), transparent 50%), linear-gradient(180deg, #07060d 0%, #0c0a14 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="coming-soon-fade mb-8">
          <Logo showOwner />
        </div>
        <p className="coming-soon-fade coming-soon-delay-1 mb-3 text-xs font-medium uppercase tracking-[0.28em] text-violet-300/80">
          Private preview
        </p>
        <h1 className="coming-soon-fade coming-soon-delay-2 max-w-xl font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-tight sm:text-5xl">
          Rumart is not public yet
        </h1>
        <p className="coming-soon-fade coming-soon-delay-3 mt-5 max-w-md text-base leading-relaxed text-white/55">
          The marketplace is locked while we finish setup. Check back soon — or use your private preview link if you have one.
        </p>
      </main>

      <footer className="relative z-10 pb-8 text-center text-xs text-white/35">
        Rumart by Velexis
      </footer>
    </div>
  );
}
