"use client";

import { useState, useTransition } from "react";
import { setMonthlyReportEmailEnabled } from "../actions";

type Props = {
  spaceId: string;
  initialEnabled: boolean;
};

export default function MonthlyReportEmailToggle({
  spaceId,
  initialEnabled,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setError(null);
    setEnabled(newValue);
    startTransition(async () => {
      try {
        await setMonthlyReportEmailEnabled(spaceId, newValue);
      } catch (err) {
        setEnabled(!newValue);
        setError(err instanceof Error ? err.message : "Falha ao atualizar");
      }
    });
  };

  return (
    <div>
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Enviar relatório mensal por e-mail
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            No dia 1º de cada mês, receba um PDF com o resumo do mês anterior
            no e-mail da sua conta Google.
          </div>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleChange}
          disabled={pending}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
        />
      </label>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
