"use client";

import { useState, useTransition } from "react";
import { downloadReport, generateReport } from "../../actions";
import { formatMonthLabel } from "@/helpers/date";
import type { ReportListRow } from "../../_types";

type Props = {
  row: ReportListRow;
  spaceId: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default function ReportRow({ row, spaceId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const monthLabel = formatMonthLabel(row.year, row.month);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        await generateReport(spaceId, row.year, row.month);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate report");
      }
    });
  };

  const handleDownload = () => {
    if (row.kind !== "generated") return;
    setError(null);
    startTransition(async () => {
      try {
        const url = await downloadReport(row.reportId);
        window.location.href = url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to download PDF");
      }
    });
  };

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col">
        <span className="text-sm font-medium capitalize text-gray-900 dark:text-gray-100">
          {monthLabel}
        </span>
        {row.kind === "generated" ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Generated {dateTimeFormatter.format(new Date(row.generatedAt))}
          </span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Pending
          </span>
        )}
        {error && (
          <span className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {row.kind === "generated" ? (
          <>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={pending}
              className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {pending ? "..." : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={pending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "..." : "Download PDF"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={pending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "Generating..." : "Generate"}
          </button>
        )}
      </div>
    </li>
  );
}
