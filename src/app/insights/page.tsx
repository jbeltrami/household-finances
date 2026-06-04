import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { monthUrl } from "@/helpers/paths";
import { brlFormatter } from "@/helpers/format";
import {
  DEFAULT_IDEAL_SETTINGS,
  DEFAULT_WINDOW,
  WINDOW_OPTIONS,
  computeInsights,
  getBucketAveragesForRange,
} from "@/helpers/insights";
import type { IdealSettings } from "@/helpers/types";
import Card from "@/components/Card";
import { INSIGHT_META } from "./_types";
import WindowSelector from "./_components/WindowSelector/WindowSelector";
import InsightCard from "./_components/InsightCard/InsightCard";
import IdealParametersForm from "./_components/IdealParametersForm/IdealParametersForm";

type Props = {
  searchParams: Promise<{ window?: string }>;
};

export default async function InsightsPage({ searchParams }: Props) {
  const supabase = await createClient();

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  // Window from the URL, validated against the allowed options.
  const { window: windowParam } = await searchParams;
  const requested = Number(windowParam);
  const windowMonths = (WINDOW_OPTIONS as readonly number[]).includes(requested)
    ? requested
    : DEFAULT_WINDOW;

  // Averages run over COMPLETE months only, so the window ends at last
  // month (the current month is still in progress and would skew the
  // average downward).
  const now = new Date();
  let endYear = now.getFullYear();
  let endMonth = now.getMonth(); // 0-based "current" == 1-based "previous"
  if (endMonth === 0) {
    endMonth = 12;
    endYear -= 1;
  }

  // Settings row may be absent — that means "use defaults".
  const { data: row } = await supabase
    .from("ideal_budget_settings")
    .select(
      "savings_rate, max_mortgage_rate, max_fixed_rate, emergency_months, freedom_annual_mult"
    )
    .eq("space_id", spaceId)
    .maybeSingle();

  const settings: IdealSettings = row
    ? {
        savings_rate: Number(row.savings_rate),
        max_mortgage_rate: Number(row.max_mortgage_rate),
        max_fixed_rate: Number(row.max_fixed_rate),
        emergency_months: Number(row.emergency_months),
        freedom_annual_mult: Number(row.freedom_annual_mult),
      }
    : DEFAULT_IDEAL_SETTINGS;

  const averages = await getBucketAveragesForRange(
    supabase,
    spaceId,
    endYear,
    endMonth,
    windowMonths
  );

  const insights = computeInsights(averages, settings);

  const backHref = monthUrl(now.getFullYear(), now.getMonth() + 1);
  const hasData = averages.monthsUsed > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <Link href={backHref} className="text-sm text-muted hover:text-fg">
        ← Voltar para este mês
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Metas financeiras</h1>
          <p className="mt-1 text-sm text-muted">
            Suas médias comparadas a um cenário ideal.
          </p>
        </div>
        <WindowSelector selected={windowMonths} />
      </div>

      {hasData ? (
        <>
          {/* Averages summary */}
          <Card className="mt-6 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-medium text-fg">Suas médias</h2>
              <span className="text-xs text-muted">
                {averages.monthsUsed === windowMonths
                  ? `últimos ${windowMonths} meses`
                  : `${averages.monthsUsed} ${
                      averages.monthsUsed === 1 ? "mês" : "meses"
                    } com dados`}
              </span>
            </div>
            <dl className="mt-4 divide-y divide-subtle">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-muted">Renda média</dt>
                <dd className="text-base font-semibold text-accent">
                  {brlFormatter.format(averages.avgIncome)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-muted">Contas fixas médias</dt>
                <dd className="text-base font-semibold text-danger">
                  {brlFormatter.format(averages.avgBills)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-muted">Despesas médias</dt>
                <dd className="text-base font-semibold text-danger">
                  {brlFormatter.format(averages.avgExpenses)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm font-medium text-fg">
                  Gastos totais médios
                </dt>
                <dd className="text-base font-semibold text-danger">
                  {brlFormatter.format(averages.avgBills + averages.avgExpenses)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Benchmark cards */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight) => (
              <InsightCard
                key={insight.key}
                insight={insight}
                meta={INSIGHT_META[insight.key]}
              />
            ))}
          </div>
        </>
      ) : (
        <Card className="mt-6 p-8 text-center">
          <p className="text-sm text-muted">
            Ainda não há dados suficientes. Adicione receitas e contas para
            ver suas metas financeiras.
          </p>
        </Card>
      )}

      <div className="mt-8">
        <IdealParametersForm initialSettings={settings} />
      </div>
    </div>
  );
}
