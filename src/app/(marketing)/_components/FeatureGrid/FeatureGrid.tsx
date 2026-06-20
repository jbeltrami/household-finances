import Link from "next/link";
import {
  CalendarDays,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

type Feature = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  href: string;
};

const FEATURES: Feature[] = [
  {
    icon: CalendarDays,
    title: "Visão mensal",
    body: "Cada mês é uma lente sobre suas finanças: receitas, contas, despesas e o saldo, tudo em uma tela.",
    href: "/guide#visao-mensal",
  },
  {
    icon: Receipt,
    title: "Contas recorrentes",
    body: "Cadastre uma vez e deixe repetir — mensal, semanal ou quinzenal. Ajuste o valor de um mês sem mexer nos outros.",
    href: "/guide#contas",
  },
  {
    icon: ShoppingBag,
    title: "Despesas avulsas",
    body: "Registre gastos pontuais do dia a dia, separados das obrigações recorrentes.",
    href: "/guide#despesas",
  },
  {
    icon: TrendingUp,
    title: "Receitas",
    body: "Lance entradas conforme elas chegam e compare o previsto com o recebido a cada mês.",
    href: "/guide#receitas",
  },
];

export default function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl tracking-tight text-fg md:text-4xl">
          Tudo o que um mês precisa
        </h2>
        <p className="mt-3 text-lg text-muted">
          Quatro peças simples que, juntas, contam a história completa do seu
          dinheiro.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.title}
              href={feature.href}
              className="group rounded-2xl border border-subtle bg-surface p-6 transition-all hover:border-accent/40 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-5 font-display text-xl text-fg">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.body}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
