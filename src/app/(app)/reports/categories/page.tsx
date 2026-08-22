import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "@/components/Card";
import { brlFormatter } from "@/helpers/format";
import { getCategorySpendForYear } from "@/helpers/category-reports";
import CategorySpendRow from "./_components/CategorySpendRow/CategorySpendRow";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";

type SearchParams = Promise<{ year?: string }>;

function parseYear(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return fallback;
  return n;
}

export default async function CategoryReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  const { year: yearRaw } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = parseYear(yearRaw, currentYear);

  const summaries = await getCategorySpendForYear(supabase, spaceId, year);
  const grandTotal = summaries.reduce((sum, s) => sum + s.total, 0);

  const prevYear = year - 1;
  const nextYear = year + 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <Link href="/reports" className="text-sm text-muted hover:text-fg">
        ← Voltar para Relatórios
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-fg">
        Gastos por categoria
      </h1>
      <p className="mt-1 text-sm text-muted">
        Soma de contas pagas e despesas avulsas, agrupadas pela categoria de
        cada lançamento. Toque numa categoria para ver o que a compõe.
        Financiamentos ainda não entram nesta conta.
      </p>

      {/* Year nav */}
      <div className="mt-6 flex items-center justify-between">
        <Link
          href={`/reports/categories?year=${prevYear}`}
          aria-label="Ano anterior"
          data-tooltip="Ano anterior"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </Link>
        <span className="text-base font-semibold text-fg">{year}</span>
        <Link
          href={`/reports/categories?year=${nextYear}`}
          aria-label="Próximo ano"
          data-tooltip="Próximo ano"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} />
        </Link>
      </div>

      {/* Grand total */}
      <Card className="mt-5 p-5">
        <p className="text-xs text-muted">Total gasto em {year}</p>
        <p className="mt-1 text-3xl font-bold text-fg">
          {brlFormatter.format(grandTotal)}
        </p>
      </Card>

      {/* Per-category breakdown */}
      {summaries.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          Nenhum gasto registrado em {year}.
        </p>
      ) : (
        <Card className="mt-5 p-2">
          <ul>
            {summaries.map((s) => (
              <CategorySpendRow
                key={s.category?.id ?? "__uncategorised__"}
                summary={s}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
