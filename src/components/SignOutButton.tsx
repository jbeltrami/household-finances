"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  compact?: boolean;
};

export default function SignOutButton({ compact = false }: Props) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (compact) {
    return (
      <button
        onClick={handleSignOut}
        aria-label="Sair"
        data-tooltip="Sair"
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-danger"
      >
        <LogOut className="h-4 w-4" strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-lg border border-subtle px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
    >
      Sair
    </button>
  );
}
