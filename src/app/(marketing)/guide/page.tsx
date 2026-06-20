import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Landmark,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guia — Home Finances",
  description:
    "Como usar a visão mensal, contas recorrentes, despesas avulsas, receitas e financiamentos.",
};

type Section = {
  id: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  intro: string;
  points: { term: string; detail: string }[];
};

const SECTIONS: Section[] = [
  {
    id: "visao-mensal",
    icon: CalendarDays,
    title: "Visão mensal",
    intro:
      "É a tela principal. Cada mês reúne suas receitas, contas e despesas com um resumo do saldo. Navegue entre os meses pela barra de calendário no topo.",
    points: [
      {
        term: "Receitas, contas e despesas",
        detail:
          "Três blocos: o que você espera receber, as contas recorrentes e os gastos avulsos do mês.",
      },
      {
        term: "Saldo do mês",
        detail:
          "O app mostra o previsto (receitas − contas), o realizado até agora e quanto ainda falta pagar.",
      },
      {
        term: "Meses anteriores travam",
        detail:
          "Ao virar o mês, o anterior é fechado para preservar o histórico. Para editar, basta reabri-lo informando um motivo.",
      },
    ],
  },
  {
    id: "contas",
    icon: Receipt,
    title: "Contas (recorrentes)",
    intro:
      "Contas são obrigações que se repetem. Você cria um modelo uma vez e ele aparece automaticamente em todos os meses, sem precisar recadastrar.",
    points: [
      {
        term: "Cadências",
        detail:
          "Mensal, semanal ou quinzenal. Defina o dia de vencimento (ou o dia da semana) e o app projeta as ocorrências.",
      },
      {
        term: "Ajuste de um mês só",
        detail:
          "Se o valor de uma conta mudar em um mês específico, edite apenas aquela ocorrência — os demais meses continuam com o valor padrão.",
      },
      {
        term: "Pular uma ocorrência",
        detail:
          "Dá para cancelar a conta de um único mês sem afetar o modelo nem os outros meses.",
      },
      {
        term: "Parcelamentos",
        detail:
          "Contas com número fixo de parcelas mostram o progresso (ex.: 3 de 12) e se encerram sozinhas ao quitar a última.",
      },
    ],
  },
  {
    id: "despesas",
    icon: ShoppingBag,
    title: "Despesas (avulsas)",
    intro:
      "Despesas são gastos pontuais — uma compra, um jantar, um imprevisto. Diferente das contas, elas não se repetem.",
    points: [
      {
        term: "Lançamento livre",
        detail:
          "Adicione na data em que aconteceu. Ela entra no mês correspondente, mesmo que você esteja vendo outro mês.",
      },
      {
        term: "Separadas das contas",
        detail:
          "Despesas avulsas são registros de gastos, não obrigações — por isso não geram lembretes de vencimento.",
      },
    ],
  },
  {
    id: "receitas",
    icon: TrendingUp,
    title: "Receitas",
    intro:
      "Receitas são as entradas do mês: salário, freelance, qualquer dinheiro que chega. Você lança conforme elas acontecem.",
    points: [
      {
        term: "Previsto e recebido",
        detail:
          "Cada receita tem uma data esperada e um status. Compare o total previsto com o que já foi recebido.",
      },
      {
        term: "Sem agenda fixa",
        detail:
          "Não há um calendário de pagamento rígido — adicione entradas livremente quando precisar.",
      },
    ],
  },
  {
    id: "financiamento",
    icon: Landmark,
    title: "Financiamento",
    intro:
      "Acompanhe financiamentos (imóvel, carro) com a tabela de amortização completa, no sistema SAC ou Price. A parcela de cada mês aparece nas contas; pagamentos extras entram como despesas.",
    points: [
      {
        term: "Simule e salve",
        detail:
          "Informe valor, taxa (ao mês ou ao ano), prazo e o sistema (SAC ou Price). A tabela é calculada na hora; salve para acompanhar mês a mês.",
      },
      {
        term: "Parcela na visão mensal",
        detail:
          "A parcela do mês entra junto das contas e conta no “falta pagar”. Marque como paga quando quitar — inclusive parcelas passadas, ao cadastrar um financiamento já em andamento.",
      },
      {
        term: "Amortizações extraordinárias",
        detail:
          "Registre pagamentos extras para reduzir o prazo ou a parcela. Eles abatem o saldo devedor e aparecem como despesa no mês em que ocorrem.",
      },
      {
        term: "Inicial, Atual e Simulado",
        detail:
          "Compare o plano original com o atual e simule pagamentos futuros, sem salvar, para ver quanto economiza em juros e tempo.",
      },
    ],
  },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <span className="text-xs font-medium uppercase tracking-widest text-accent">
        Guia
      </span>
      <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-fg md:text-5xl">
        Como usar o Home Finances
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted">
        Um passeio rápido pelas principais partes do app. Cada seção abaixo
        cobre um pedaço da sua rotina financeira.
      </p>

      {/* Table of contents */}
      <nav className="mt-10 rounded-2xl border border-subtle bg-surface p-2">
        <ul className="flex flex-col">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  {section.title}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sections */}
      <div className="mt-16 space-y-16">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h2 className="font-display text-2xl tracking-tight text-fg md:text-3xl">
                  {section.title}
                </h2>
              </div>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                {section.intro}
              </p>
              <dl className="mt-6 space-y-4 border-l-2 border-subtle pl-5">
                {section.points.map((point) => (
                  <div key={point.term}>
                    <dt className="text-sm font-semibold text-fg">
                      {point.term}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted">
                      {point.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>

      <div className="mt-16 border-t border-subtle pt-10 text-center">
        <h2 className="font-display text-2xl text-fg">É hora de começar</h2>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Entrar com o Google
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
