import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import Hero from "./_components/Hero/Hero";
import FeatureGrid from "./_components/FeatureGrid/FeatureGrid";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const ctaHref = user ? monthUrl(now.getFullYear(), now.getMonth() + 1) : "/login";
  const ctaLabel = user ? "Ir para o app" : "Começar com o Google";

  return (
    <>
      <Hero ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <FeatureGrid />

      {/* Closing CTA band */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-subtle bg-surface px-8 py-14 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(50% 80% at 50% 0%, var(--color-accent-soft), transparent 70%)",
            }}
          />
          <h2 className="font-display text-3xl tracking-tight text-fg md:text-4xl">
            Pronto para organizar o mês?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Entre com sua conta Google e comece a planejar em segundos.
          </p>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </>
  );
}
