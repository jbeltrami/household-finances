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
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={handleLogin}
        className="rounded-lg bg-white px-6 py-3 text-gray-800 shadow-md transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 font-medium"
      >
        Entrar com o Google
      </button>
    </div>
  );
}
