"use client";

import { useState, useTransition } from "react";
import { Download, RefreshCw, Send } from "lucide-react";
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
    <li className="flex items-center gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium capitalize text-fg">{monthLabel}</p>
        {row.kind === "generated" ? (
          <>
            <p className="text-xs text-muted">
              Gerado em {dateTimeFormatter.format(new Date(row.generatedAt))}
            </p>
            {row.sentAt && (
              <p className="text-xs text-muted">
                Enviado em {dateTimeFormatter.format(new Date(row.sentAt))}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-warn">Pendente</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {row.kind === "generated" ? (
          <>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={pending}
              aria-label="Regenerar"
              data-tooltip="Regenerar"
              className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={pending}
              aria-label={row.sentAt ? "Reenviar por e-mail" : "Enviar por e-mail"}
              data-tooltip={row.sentAt ? "Reenviar por e-mail" : "Enviar por e-mail"}
              className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
            >
              <Send className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={pending}
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              {pending ? "…" : "Baixar PDF"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={pending}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Gerando…" : "Gerar"}
          </button>
        )}
      </div>
    </li>
  );
}
