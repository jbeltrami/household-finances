"use client";

import { useState, useTransition } from "react";
import { brlFormatter, dateFormatter } from "@/helpers/format";
import {
  deleteIncomeEntry,
  toggleIncomeReceived,
  updateIncomeEntry,
} from "../../actions";
import type { IncomeRow } from "../../_types";

type Props = {
  entry: IncomeRow;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
};

export default function IncomeEntryRow({
  entry,
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

  const expectedDay = parseInt(entry.expected_date.split("-")[2], 10);
  const isHighlighted =
    highlightedDay !== null && expectedDay === highlightedDay;

  const [isToggling, startToggle] = useTransition();
  const handleToggleReceived = () => {
    startToggle(async () => {
      await toggleIncomeReceived(entry.id, !entry.received, new FormData());
    });
  };

  const [isUpdating, startUpdate] = useTransition();
  const handleUpdate = (formData: FormData) => {
    startUpdate(async () => {
      const result = await updateIncomeEntry(
        entry.id,
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
    if (!window.confirm(`Excluir "${entry.name}"?`)) return;
    startDelete(async () => {
      await deleteIncomeEntry(entry.id);
    });
  };

  return (
    <li
      className={`flex items-center justify-between px-4 py-3 transition-colors ${
        isHighlighted ? "bg-blue-50 dark:bg-blue-900/20" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {entry.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Esperado em {dateFormatter.format(new Date(entry.expected_date))}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {editing && !noEdit ? (
          <form action={handleUpdate} className="flex items-center gap-2">
            <input
              type="text"
              name="name"
              required
              defaultValue={entry.name}
              className="w-32 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <input
              type="number"
              name="amount"
              min="0"
              step="5"
              required
              defaultValue={String(entry.amount)}
              autoFocus
              className="w-28 rounded-md border border-gray-300 bg-white px-2 py-1 text-right text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={isUpdating}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                isUpdating
                  ? "animate-pulse bg-gray-400 text-white dark:bg-gray-600"
                  : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              }`}
            >
              {isUpdating ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isUpdating}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {brlFormatter.format(entry.amount)}
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
          </>
        )}

        {noEdit ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              entry.received
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200"
            }`}
          >
            {entry.received ? "recebido" : "pendente"}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleToggleReceived}
            disabled={isToggling}
            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              isToggling
                ? "animate-pulse bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                : entry.received
                  ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-200 dark:hover:bg-green-900/60"
                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:hover:bg-yellow-900/60"
            }`}
            title={entry.received ? "Marcar como pendente" : "Marcar como recebido"}
          >
            {isToggling ? "…" : entry.received ? "recebido" : "pendente"}
          </button>
        )}

        {!noEdit && (
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

      {updateError && editing && (
        <p
          className="absolute mt-12 text-xs text-red-600 dark:text-red-400"
          role="alert"
        >
          {updateError}
        </p>
      )}
    </li>
  );
}
