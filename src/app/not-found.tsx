import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <Logo showWord={false} className="mx-auto" />
        <p className="mt-6 text-7xl font-semibold tracking-tight text-ink-950">404</p>
        <h1 className="mt-2 text-xl font-medium text-ink-900">This page doesn’t exist</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
          The page you’re looking for may have moved or the listing may have sold.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/"><Button>Back home</Button></Link>
          <Link href="/marketplace"><Button variant="outline">Browse marketplace</Button></Link>
        </div>
      </div>
    </div>
  );
}
