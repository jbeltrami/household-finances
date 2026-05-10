"use client";

import { useActionState, useState } from "react";
import { unlockMonth } from "../../actions";
import { initialFormState } from "../../form-state";

type Props = {
  spaceId: string;
  year: number;
  month: number;
};

export default function UnlockBanner({ spaceId, year, month }: Props) {
  const [showForm, setShowForm] = useState(false);

  // Bind space + year + month; unlockMonth inserts a month_unlocks row.
  const boundAction = unlockMonth.bind(null, spaceId, year, month);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialFormState
  );

  return (
    <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Este mês está bloqueado
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            Meses anteriores são somente leitura por padrão. Desbloqueie este
            mês informando um motivo se precisar editar.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
          >
            Desbloquear
          </button>
        )}
      </div>

      {showForm && (
        <form action={formAction} className="mt-4">
          <label
            htmlFor="reason"
            className="block text-xs font-medium text-amber-900 dark:text-amber-200"
          >
            Motivo do desbloqueio
          </label>
          <textarea
            id="reason"
            name="reason"
            required
            rows={2}
            minLength={5}
            placeholder="ex.: Corrigindo um erro no valor da Claro"
            className="mt-1 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-amber-700 dark:bg-gray-900 dark:text-gray-100"
          />

          {state.error && (
            <p
              className="mt-2 text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.error}
            </p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={isPending}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:text-amber-200 dark:hover:bg-amber-900/50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
            >
              {isPending ? "Desbloqueando…" : "Desbloquear mês"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
