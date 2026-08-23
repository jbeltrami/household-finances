"use client";

import { useState, useTransition } from "react";
import Card from "@/components/Card";
import { sendTestAlert, setOverdueAlertEnabled } from "../actions";
import type { TestAlertResult } from "../_types";

type Props = {
  initialEnabled: boolean;
  // ISO timestamp of the last Aviso that actually went out, or null if none
  // ever has. Null is meaningful: it is the difference between "quiet because
  // nothing has been Vencida" and "quiet because this has never worked".
  lastSentAt: string | null;
};

const lastSentFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default function OverdueAlertToggle({
  initialEnabled,
  lastSentAt,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [testPending, startTest] = useTransition();
  const [testResult, setTestResult] = useState<TestAlertResult | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setError(null);
    setEnabled(newValue);
    startTransition(async () => {
      try {
        await setOverdueAlertEnabled(newValue);
      } catch (err) {
        setEnabled(!newValue);
        setError(err instanceof Error ? err.message : "Falha ao atualizar");
      }
    });
  };

  const handleTest = () => {
    setTestResult(null);
    startTest(async () => {
      setTestResult(await sendTestAlert());
    });
  };

  return (
    <Card className="p-5">
      <h2 className="text-base font-medium text-fg">Avisos de vencimento</h2>

      <label className="mt-4 flex cursor-pointer items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-fg">
            Avisar por e-mail quando algo vencer
          </div>
          <div className="mt-1 text-xs text-muted">
            Todo dia às 08:00, receba um e-mail com as contas e parcelas
            vencidas que ainda estão em aberto. O aviso se repete a cada dia
            enquanto houver algo em aberto.
          </div>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleChange}
          disabled={pending}
          className="mt-0.5 h-4 w-4 rounded border-subtle accent-[--color-accent] disabled:opacity-50"
        />
      </label>
      {error && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs text-muted">
        {lastSentAt
          ? `Último aviso: ${lastSentFormatter.format(new Date(lastSentAt))}`
          : "Nenhum aviso enviado ainda."}
      </p>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleTest}
          disabled={testPending}
          className="rounded-lg border border-subtle px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testPending ? "Enviando…" : "Enviar um aviso de teste"}
        </button>
        {testResult?.kind === "sent" && (
          <p className="mt-2 text-xs text-accent">
            Enviado com {testResult.count}{" "}
            {testResult.count === 1 ? "pagamento" : "pagamentos"} em aberto.
            Confira seu e-mail.
          </p>
        )}
        {testResult?.kind === "nothing-overdue" && (
          <p className="mt-2 text-xs text-muted">
            Nada vencido neste mês, então não há aviso para enviar. Está tudo em
            dia.
          </p>
        )}
        {testResult?.kind === "rate-limited" && (
          <p className="mt-2 text-xs text-warn" role="alert">
            Você já enviou avisos demais na última hora. Tente novamente às{" "}
            {testResult.retryAt}.
          </p>
        )}
        {testResult?.kind === "error" && (
          <p className="mt-2 text-xs text-danger" role="alert">
            {testResult.message}
          </p>
        )}
      </div>
    </Card>
  );
}
