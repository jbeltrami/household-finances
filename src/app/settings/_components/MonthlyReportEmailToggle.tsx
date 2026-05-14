"use client";

import { useState, useTransition } from "react";
import Card from "@/components/Card";
import { setMonthlyReportEmailEnabled } from "../actions";

type Props = {
  initialEnabled: boolean;
};

export default function MonthlyReportEmailToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setError(null);
    setEnabled(newValue);
    startTransition(async () => {
      try {
        await setMonthlyReportEmailEnabled(newValue);
      } catch (err) {
        setEnabled(!newValue);
        setError(err instanceof Error ? err.message : "Falha ao atualizar");
      }
    });
  };

  return (
    <Card className="p-5">
      <h2 className="text-base font-medium text-fg">Relatórios por e-mail</h2>
      <label className="mt-4 flex cursor-pointer items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-fg">
            Enviar relatório mensal por e-mail
          </div>
          <div className="mt-1 text-xs text-muted">
            No dia 1º de cada mês, receba um PDF com o resumo do mês anterior
            no e-mail da sua conta Google.
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
    </Card>
  );
}
