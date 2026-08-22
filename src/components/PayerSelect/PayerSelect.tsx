"use client";

import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import type { PayerRow } from "@/helpers/taxonomy";
import { createPayerInline } from "@/app/(app)/settings/categories/actions";

type Props = {
  payers: PayerRow[];
  current?: { id: string; name: string } | null;
  name?: string;
  id?: string;
};

// The Pagador dropdown, with inline creation.
//
// Adding a client mid-Receita is the common case — you are entering the
// money precisely because someone new paid you. Sending the user to
// Configurações to create the Pagador first would lose everything already
// typed into the form, so the new name is created in place and selected.
//
// The added Pagador is kept in local state rather than waiting for the
// server-rendered list to refresh, so the selection survives the revalidate.
export default function PayerSelect({
  payers,
  current = null,
  name = "payer_id",
  id,
}: Props) {
  const [added, setAdded] = useState<PayerRow[]>([]);
  const [selected, setSelected] = useState<string>(current?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const options = [...payers, ...added];
  const currentIsRetired =
    current != null && !options.some((p) => p.id === current.id);

  const handleAdd = () => {
    const value = draft.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await createPayerInline(value);
      if (result.error || !result.payer) {
        setError(result.error ?? "Falha ao criar o pagador");
        return;
      }
      // Guard against the reactivation path handing back a Pagador that is
      // already in `payers` — pushing it again would duplicate the option.
      setAdded((prev) =>
        options.some((p) => p.id === result.payer!.id)
          ? prev
          : [...prev, result.payer!]
      );
      setSelected(result.payer.id);
      setDraft("");
      setError(null);
      setAdding(false);
    });
  };

  return (
    <div>
      <select
        id={id}
        name={name}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="field-input"
      >
        <option value="">Sem pagador</option>
        {options.map((payer) => (
          <option key={payer.id} value={payer.id}>
            {payer.name}
          </option>
        ))}
        {currentIsRetired && (
          <option value={current.id}>{current.name} (desativado)</option>
        )}
      </select>

      {adding ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter inside a form would submit the Receita, not add the
              // Pagador. Intercept it.
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setAdding(false);
                setError(null);
              }
            }}
            placeholder="Nome do pagador"
            aria-label="Nome do novo pagador"
            autoFocus
            className="field-input mt-0 flex-1"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !draft.trim()}
            aria-label="Adicionar pagador"
            className="btn-ghost"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setError(null);
            }}
            disabled={isPending}
            aria-label="Cancelar"
            className="btn-ghost"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Novo pagador
        </button>
      )}

      {error && (
        <p className="mt-1 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
