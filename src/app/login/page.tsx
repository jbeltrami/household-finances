"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-2xl border border-subtle bg-surface p-8 text-center shadow-sm">
        <h1 className="text-2xl font-light text-fg">
          Home <span className="font-bold">Finances</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Planejador de finanças pessoais
        </p>
        <button
          onClick={handleLogin}
          className="mt-6 w-full rounded-lg border border-subtle bg-canvas px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
        >
          Entrar com o Google
        </button>
      </div>
    </div>
  );
}
