"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import BillIcon from "@/components/BillIcon";
import CategoryChip from "@/components/CategoryChip";
import IconPicker from "@/components/IconPicker/IconPicker";
import type { CategoryRow } from "@/helpers/taxonomy";
import CategorySelect from "@/components/CategorySelect/CategorySelect";
import CurrencyInput from "@/components/CurrencyInput/CurrencyInput";
import { brlFormatter, dateFormatter } from "@/helpers/format";
import { deleteEntry, updateEntry } from "../../actions";
import type { EntryRow } from "../../_types";

type Props = {
  expense: EntryRow;                 // template_id is guaranteed null here
  categories: CategoryRow[];         // active outflow Categorias
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
};

export default function ExpenseEntryRow({
  expense,
  categories,
  year,
  month,
  locked,
  highlightedDay,
}: Props) {
  void year;
  void month;

  const noEdit = locked;
  const [editing, setEditing] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const expenseDay = parseInt(expense.date.split("-")[2], 10);
  const isHighlighted =
    highlightedDay !== null && expenseDay === highlightedDay;

  const [isUpdating, startUpdate] = useTransition();
  const handleUpdate = (formData: FormData) => {
    if (expense.id == null) return;
    startUpdate(async () => {
      const result = await updateEntry(
        expense.id!,
        { error: null },
        formData
      );
      if (result.error) {
        setUpdateError(result.error);
      } else {
        setUpdateError(null);
        setEditing(false);
      }
    });
  };

  const handleCancel = () => {
    setEditing(false);
    setUpdateError(null);
  };

  const [isDeleting, startDelete] = useTransition();
  const handleDelete = () => {
    if (expense.id == null) return;
    if (!window.confirm(`Excluir "${expense.name}"?`)) return;
    startDelete(async () => {
      await deleteEntry(expense.id!);
    });
  };

  if (editing && !noEdit) {
    return (
      <li className="px-3 py-3">
        <form action={handleUpdate}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="field-label">Nome</label>
              <input
                name="name"
                type="text"
                required
                defaultValue={expense.name}
                autoFocus
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Valor</label>
              <CurrencyInput
                name="amount"
                required
                defaultValue={String(expense.amount)}
              />
            </div>
            <div className="sm:col-span-3">
              <label className="field-label">Categoria (opcional)</label>
              <CategorySelect
                categories={categories}
                current={expense.category}
              />
            </div>
            <div className="sm:col-span-3">
              <label className="field-label">Ícone (opcional)</label>
              <IconPicker defaultValue={expense.icon} />
            </div>
            <div className="sm:col-span-3">
              <label className="field-label">Observações</label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={expense.notes ?? ""}
                className="field-input"
              />
            </div>
          </div>

          {updateError && (
            <p className="mt-2 text-xs text-danger" role="alert">
              {updateError}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isUpdating}
              className="btn-danger-ghost py-1.5 text-xs"
            >
              {isDeleting ? "Excluindo…" : "Excluir"}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isUpdating}
                className="btn-ghost py-1.5 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="btn-primary py-1.5 text-xs"
              >
                {isUpdating ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className={
        "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 " +
        (isHighlighted ? "bg-accent-soft" : "")
      }
    >
      {expense.category ? (
        <CategoryChip
          icon={expense.icon ?? expense.category.icon}
          color={expense.category.color}
          className="h-8 w-8"
        />
      ) : (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg"
          aria-hidden="true"
        >
          <BillIcon iconKey={expense.icon} className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-32 flex-1">
        <p className="text-sm font-medium text-fg">{expense.name}</p>
        <p className="text-xs text-muted">
          {dateFormatter.format(new Date(expense.date))}
          {expense.category && ` · ${expense.category.name}`}
          {expense.notes && ` · ${expense.notes}`}
        </p>
      </div>

      <p className="shrink-0 text-sm font-medium text-fg">
        {brlFormatter.format(expense.amount)}
      </p>

      {!noEdit && (
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Editar"
            data-tooltip="Editar"
          >
            <Pencil className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-danger disabled:opacity-50"
            aria-label="Excluir"
            data-tooltip="Excluir"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </li>
  );
}
