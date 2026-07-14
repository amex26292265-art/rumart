"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { registerAction } from "@/app/actions/auth";

function AuthCard() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === "register") {
      const res = await registerAction({ email, password, name });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
    }
    const result = await signIn("credentials", { redirect: false, email, password });
    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card w-full max-w-sm p-8"
    >
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo showWord={false} />
        <h1 className="mt-4 text-xl font-semibold text-ink-950">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {mode === "login" ? "Sign in to continue" : "Join Rumart in seconds"}
        </p>
      </div>

      <div className="space-y-3">
        {mode === "register" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="field"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="field"
          autoComplete="username"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="field"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </div>

      <p className="mt-5 text-center text-sm text-ink-500">
        {mode === "login" ? "New to Rumart?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="font-medium text-accent-600 hover:text-accent-500"
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </motion.form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-[80vh] place-items-center px-4">
      <Suspense>
        <AuthCard />
      </Suspense>
    </div>
  );
}
