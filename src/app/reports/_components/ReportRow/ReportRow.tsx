"use client";

import { useState, useTransition } from "react";
import {
  downloadReport,
  generateReport,
  sendMonthlyReportEmail,
} from "../../actions";
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
        setError(e instanceof Error ? e.message : "Falha ao gerar o relatório");
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
        setError(e instanceof Error ? e.message : "Falha ao baixar o PDF");
      }
    });
  };

  const handleSend = () => {
    if (row.kind !== "generated") return;
    setError(null);
    startTransition(async () => {
      try {
        await sendMonthlyReportEmail(row.reportId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao enviar o e-mail");
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
          <>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Gerado em {dateTimeFormatter.format(new Date(row.generatedAt))}
            </span>
            {row.sentAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Enviado em {dateTimeFormatter.format(new Date(row.sentAt))}
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Pendente
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
              {pending ? "..." : "Regenerar"}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={pending}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {pending ? "..." : row.sentAt ? "Reenviar" : "Enviar por e-mail"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={pending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "..." : "Baixar PDF"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={pending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "Gerando…" : "Gerar"}
          </button>
        )}
      </div>
    </li>
  );
}
