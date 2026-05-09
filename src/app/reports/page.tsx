import { notFound, redirect } from "next/navigation";
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Reports
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Download a PDF summary of any past month.
      </p>

      {hasMissing && (
        <div className="mt-6">
          <GenerateMissingButton spaceId={spaceId} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          No past months with data yet. Come back here once you have recorded
          entries in a previous month.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-200 dark:divide-gray-800">
          {rows.map((row) => (
            <ReportRow
              key={`${row.year}-${row.month}`}
              row={row}
              spaceId={spaceId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
