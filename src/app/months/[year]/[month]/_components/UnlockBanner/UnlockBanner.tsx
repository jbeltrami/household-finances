"use client";

import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { unlockMonth } from "../../actions";
import { initialFormState } from "../../form-state";

type Props = {
  spaceId: string;
  year: number;
  month: number;
};

export default function UnlockBanner({ spaceId, year, month }: Props) {
  const [showForm, setShowForm] = useState(false);

  const boundAction = unlockMonth.bind(null, spaceId, year, month);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialFormState
  );

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4">
      <Lock className="h-5 w-5 shrink-0 text-warn" strokeWidth={2} />
      <div className="flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-fg">
              Este mês está bloqueado
            </p>
            <p className="mt-1 text-xs text-muted">
              Meses anteriores são somente leitura por padrão. Desbloqueie este
              mês informando um motivo se precisar editar.
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="shrink-0 rounded-lg bg-warn px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Desbloquear
            </button>
          )}
        </div>

        {showForm && (
          <form action={formAction} className="mt-4">
            <label htmlFor="reason" className="field-label">
              Motivo do desbloqueio
            </label>
            <textarea
              id="reason"
              name="reason"
              required
              rows={2}
              minLength={5}
              placeholder="ex.: Corrigindo um erro no valor da Claro"
              className="field-input"
            />

            {state.error && (
              <p className="mt-2 text-xs text-danger" role="alert">
                {state.error}
              </p>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={isPending}
                className="btn-ghost py-1.5 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-warn px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Desbloqueando…" : "Desbloquear mês"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
