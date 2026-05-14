import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PieChart } from "lucide-react";
import Card from "@/components/Card";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { listNonEmptyPastMonths } from "@/helpers/reports";
import GenerateMissingButton from "./_components/GenerateMissingButton/GenerateMissingButton";
import ReportRow from "./_components/ReportRow/ReportRow";
import type { ReportListRow } from "./_types";

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  const { data: existing } = await supabase
    .from("monthly_reports")
    .select("id, year, month, generated_at, sent_at")
    .eq("space_id", spaceId);

  const existingByKey = new Map(
    (existing ?? []).map((r) => [`${r.year}-${r.month}`, r])
  );

  const candidates = await listNonEmptyPastMonths(supabase, spaceId);

  const rows: ReportListRow[] = candidates.map((c) => {
    const ex = existingByKey.get(`${c.year}-${c.month}`);
    if (ex) {
      return {
        kind: "generated",
        reportId: ex.id as string,
        year: c.year,
        month: c.month,
        generatedAt: ex.generated_at as string,
        sentAt: (ex.sent_at as string | null) ?? null,
      };
    }
    return {
      kind: "missing",
      year: c.year,
      month: c.month,
    };
  });

  const hasMissing = rows.some((r) => r.kind === "missing");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl font-semibold text-fg">Relatórios</h1>
      <p className="mt-1 text-sm text-muted">
        Baixe um PDF com o resumo de qualquer mês anterior.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {hasMissing && <GenerateMissingButton spaceId={spaceId} />}
        <Link
          href="/reports/categories"
          className="inline-flex items-center gap-2 rounded-lg border border-subtle bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
        >
          <PieChart className="h-4 w-4" strokeWidth={2} />
          Gastos por categoria
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          Nenhum mês anterior com lançamentos ainda. Volte aqui quando tiver
          registrado lançamentos em um mês passado.
        </p>
      ) : (
        <Card className="mt-6 p-2">
          <ul className="divide-y divide-subtle">
            {rows.map((row) => (
              <ReportRow
                key={`${row.year}-${row.month}`}
                row={row}
                spaceId={spaceId}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
