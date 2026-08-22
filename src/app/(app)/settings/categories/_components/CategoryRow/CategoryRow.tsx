"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import CategoryChip from "@/components/CategoryChip";
import IconPicker from "@/components/IconPicker/IconPicker";
import ColorPicker from "@/components/ColorPicker/ColorPicker";
import type { CategoryRow as Category } from "@/helpers/taxonomy";
import { deleteCategory, setCategoryActive, updateCategory } from "../../actions";
import { initialFormState } from "../../form-state";

type Props = {
  category: Category;
};

// Owns its own edit/error state, per the route conventions: a row that
// manages itself needs no coordination with its siblings, so the list
// stays a plain server-rendered map.
export default function CategoryRow({ category }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const run = (work: () => Promise<{ error: string | null }>) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) setEditing(false);
    });
  };

  const handleSave = (formData: FormData) =>
    run(() => updateCategory(initialFormState, formData));

  const handleToggleActive = () =>
    run(() => setCategoryActive(category.id, !category.active));

  const handleDelete = () => run(() => deleteCategory(category.id));

  if (editing) {
    return (
      <li className="px-3 py-3">
        <form
          ref={formRef}
          action={handleSave}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="kind" value={category.kind} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor={`edit-name-${category.id}`} className="field-label">
                Nome
              </label>
              <input
                id={`edit-name-${category.id}`}
                name="name"
                type="text"
                required
                minLength={2}
                defaultValue={category.name}
                className="field-input"
              />
            </div>
            <div className="sm:w-52">
              <span className="field-label">Ícone</span>
              <IconPicker name="icon" defaultValue={category.icon} />
            </div>
          </div>

          <div>
            <span className="field-label">Cor</span>
            <ColorPicker name="color" defaultValue={category.color} />
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
      <CategoryChip icon={category.icon} color={category.color} />

      <div className="min-w-0 flex-1">
        <p
          className={
            "text-sm font-medium " +
            (category.active ? "text-fg" : "text-muted line-through")
          }
        >
          {category.name}
        </p>
        {error && (
          <p className="mt-0.5 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* Available on inactive rows too: reactivation fails when the name
            has since been taken, and renaming is the only way out of that. */}
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={isPending}
          aria-label={`Editar ${category.name}`}
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
            category.active
              ? `Desativar ${category.name}`
              : `Reativar ${category.name}`
          }
          data-tooltip={category.active ? "Desativar" : "Reativar"}
          className="btn-ghost"
        >
          {category.active ? (
            <X className="h-4 w-4" strokeWidth={2} />
          ) : (
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
          )}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Excluir ${category.name}`}
          data-tooltip="Excluir"
          className="btn-danger-ghost"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </li>
  );
}
