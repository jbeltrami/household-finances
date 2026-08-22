"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import ColorPicker from "@/components/ColorPicker/ColorPicker";
import PayerChip from "@/components/PayerChip";
import type { PayerRow as Payer } from "@/helpers/taxonomy";
import { deletePayer, setPayerActive, updatePayer } from "../../actions";
import { initialFormState } from "../../form-state";

type Props = {
  payer: Payer;
};

export default function PayerRow({ payer }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (work: () => Promise<{ error: string | null }>) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) setEditing(false);
    });
  };

  const handleSave = (formData: FormData) =>
    run(() => updatePayer(initialFormState, formData));

  const handleToggleActive = () =>
    run(() => setPayerActive(payer.id, !payer.active));

  const handleDelete = () => run(() => deletePayer(payer.id));

  if (editing) {
    return (
      <li className="px-3 py-3">
        <form action={handleSave} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={payer.id} />

          <div>
            <label htmlFor={`edit-payer-${payer.id}`} className="field-label">
              Nome
            </label>
            <input
              id={`edit-payer-${payer.id}`}
              name="name"
              type="text"
              required
              minLength={2}
              defaultValue={payer.name}
              className="field-input"
            />
          </div>

          <div>
            <span className="field-label">Cor</span>
            <ColorPicker name="color" defaultValue={payer.color} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={isPending} className="btn-primary">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" strokeWidth={2} />
                {isPending ? "Salvando…" : "Salvar"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={isPending}
              className="btn-ghost"
            >
              <span className="flex items-center gap-1.5">
                <X className="h-4 w-4" strokeWidth={2} />
                Cancelar
              </span>
            </button>
          </div>

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-3">
      <PayerChip name={payer.name} color={payer.color} />

      <div className="min-w-0 flex-1">
        <p
          className={
            "text-sm font-medium " +
            (payer.active ? "text-fg" : "text-muted line-through")
          }
        >
          {payer.name}
        </p>
        {error && (
          <p className="mt-0.5 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={isPending}
          aria-label={`Editar ${payer.name}`}
          data-tooltip="Editar"
          className="btn-ghost"
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={handleToggleActive}
          disabled={isPending}
          aria-label={
            payer.active ? `Desativar ${payer.name}` : `Reativar ${payer.name}`
          }
          data-tooltip={payer.active ? "Desativar" : "Reativar"}
          className="btn-ghost"
        >
          {payer.active ? (
            <X className="h-4 w-4" strokeWidth={2} />
          ) : (
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
          )}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Excluir ${payer.name}`}
          data-tooltip="Excluir"
          className="btn-danger-ghost"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </li>
  );
}
