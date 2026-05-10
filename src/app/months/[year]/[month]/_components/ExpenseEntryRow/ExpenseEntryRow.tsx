"use client";

import { useState, useTransition } from "react";
import { brlFormatter, dateFormatter } from "@/helpers/format";
import { deleteEntry, updateEntry } from "../../actions";
import type { EntryRow } from "../../_types";

type Props = {
  expense: EntryRow;                 // template_id is guaranteed null here
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
};

export default function ExpenseEntryRow({
  expense,
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
      <li className="px-4 py-3">
        <form action={handleUpdate}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Nome
              </label>
              <input
                name="name"
                type="text"
                required
                defaultValue={expense.name}
                autoFocus
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Valor (BRL)
              </label>
              <input
                name="amount"
                type="number"
                min="0"
                step="5"
                required
                defaultValue={String(expense.amount)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-right text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Categoria
              </label>
              <input
                name="category"
                type="text"
                defaultValue={expense.category ?? ""}
                placeholder="ex.: Alimentação, Transporte, Saúde"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Observações
              </label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={expense.notes ?? ""}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {updateError && (
            <p
              className="mt-2 text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {updateError}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isUpdating}
              className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
            >
              {isDeleting ? "Excluindo…" : "Excluir"}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isUpdating}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  isUpdating
                    ? "animate-pulse bg-gray-400 text-white dark:bg-gray-600"
                    : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                }`}
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
      className={`flex items-start justify-between gap-4 px-4 py-3 transition-colors ${
        isHighlighted ? "bg-blue-50 dark:bg-blue-900/20" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {expense.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {dateFormatter.format(new Date(expense.date))}
          {expense.category && ` · ${expense.category}`}
        </p>
        {expense.notes && (
          <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">
            {expense.notes}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {brlFormatter.format(expense.amount)}
        </p>
        {!noEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Editar
          </button>
        )}
        {!noEdit && expense.id != null && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={`text-xs font-medium ${
              isDeleting
                ? "animate-pulse text-red-400 dark:text-red-500"
                : "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            }`}
          >
            {isDeleting ? "Excluindo…" : "Excluir"}
          </button>
        )}
      </div>
    </li>
  );
}
