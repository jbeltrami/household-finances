"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-lg border border-subtle px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
    >
      Sair
    </button>
  );
}
