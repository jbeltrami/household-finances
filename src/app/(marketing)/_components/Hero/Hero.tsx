import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

type Props = {
  ctaHref: string;
  ctaLabel: string;
};

// Stylized monthly summary that mirrors the real app's monthly view — gives
// first-time visitors an honest preview of what they'll get.
function SummaryCard() {
  const rows = [
    { label: "Receitas previstas", value: "R$ 21.000", tone: "fg" },
    { label: "Total de contas", value: "R$ 12.840", tone: "fg" },
    { label: "Pago até agora", value: "R$ 4.470", tone: "muted" },
  ];

  return (
    <div className="animate-fade-up [animation-delay:240ms] relative w-full max-w-sm rounded-2xl border border-subtle bg-surface p-6 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-lg text-fg">Junho 2026</p>
        <span className="pill-pending">em aberto</span>
      </div>
      <dl className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <dt className="text-muted">{row.label}</dt>
            <dd
              className={
                "font-mono tabular-nums " +
                (row.tone === "muted" ? "text-muted" : "text-fg")
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 border-t border-subtle pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-fg">Falta pagar</span>
          <span className="font-mono text-lg font-semibold tabular-nums text-accent">
            R$ 8.370
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Hero({ ctaHref, ctaLabel }: Props) {
  return (
    <section className="relative overflow-hidden">
      {/* Atmosphere: layered radial washes in the accent tone + a faint grid. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 0%, var(--color-accent-soft), transparent 70%), radial-gradient(50% 60% at 100% 10%, var(--color-warn-soft), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.4] [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--color-subtle) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-subtle bg-surface/60 px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Finanças pessoais, mês a mês
          </span>

          <h1 className="animate-fade-up [animation-delay:80ms] mt-6 font-display text-5xl leading-[1.05] tracking-tight text-fg md:text-6xl">
            Planeje seu mês,{" "}
            <span className="italic text-accent">sem surpresas</span>.
          </h1>

          <p className="animate-fade-up [animation-delay:160ms] mt-6 max-w-md text-lg leading-relaxed text-muted">
            Acompanhe receitas, contas recorrentes e despesas avulsas em uma
            visão mensal clara. Saiba exatamente quanto entra, quanto sai e
            quanto ainda falta pagar.
          </p>

          <div className="animate-fade-up [animation-delay:320ms] mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 rounded-full border border-subtle px-5 py-3 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
            >
              <BookOpen className="h-4 w-4" strokeWidth={1.75} />
              Ver o guia
            </Link>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <SummaryCard />
        </div>
      </div>
    </section>
  );
}
