import Link from "next/link";
import { ArrowRight, CalendarRange, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre — Home Finances",
  description: "O que é o Home Finances e a filosofia por trás dele.",
};

const PRINCIPLES = [
  {
    icon: CalendarRange,
    title: "O mês como unidade",
    body: "Em vez de uma planilha infinita, cada mês é uma página própria. Você fecha um mês, abre o próximo e mantém o foco no que importa agora.",
  },
  {
    icon: Users,
    title: "Pessoal, para poucos",
    body: "Pensado para um pequeno grupo de amigos e família. Cada pessoa tem seu próprio espaço, criado automaticamente no primeiro acesso.",
  },
  {
    icon: ShieldCheck,
    title: "Entrada simples e segura",
    body: "Sem senhas para lembrar. O acesso é feito apenas com sua conta Google, e seus dados ficam isolados no seu espaço.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <span className="text-xs font-medium uppercase tracking-widest text-accent">
        Sobre
      </span>
      <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-fg md:text-5xl">
        Um planejador que pensa{" "}
        <span className="italic text-accent">mês a mês</span>.
      </h1>

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted">
        <p>
          O <strong className="font-medium text-fg">Home Finances</strong> é um
          planejador de finanças pessoais para quem quer enxergar o mês com
          clareza: o que entra, o que sai e o que ainda falta pagar. Nada de
          fórmulas complicadas — só o essencial, organizado.
        </p>
        <p>
          Por baixo, cada mês é uma lente sobre um histórico de lançamentos por
          data. As contas recorrentes se repetem sozinhas a partir de um modelo;
          você só registra exceções quando o valor muda, quando paga ou quando
          quer pular uma ocorrência. Meses passados se fecham automaticamente
          para preservar o histórico — e só reabrem com um motivo registrado.
        </p>
      </div>

      <div className="mt-14 space-y-4">
        {PRINCIPLES.map((principle) => {
          const Icon = principle.icon;
          return (
            <div
              key={principle.title}
              className="flex gap-4 rounded-2xl border border-subtle bg-surface p-6"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="font-display text-xl text-fg">
                  {principle.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {principle.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-14 flex flex-wrap items-center gap-3">
        <Link
          href="/guide"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Ler o guia
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full border border-subtle px-5 py-3 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
        >
          Entrar com o Google
        </Link>
      </div>
    </div>
  );
}
