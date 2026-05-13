"use client";

import { useState, useTransition } from "react";
import { Check, Clock, Pencil, TrendingUp, Trash2 } from "lucide-react";
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

  const [isDeleting, startDelete] = useTransition();
  const handleDelete = () => {
    if (!window.confirm(`Excluir "${entry.name}"?`)) return;
    startDelete(async () => {
      await deleteIncomeEntry(entry.id);
    });
  };

  if (editing && !noEdit) {
    return (
      <li className="px-3 py-2">
        <form
          action={handleUpdate}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            name="name"
            required
            defaultValue={entry.name}
            className="field-input mt-0 min-w-32 flex-1"
          />
          <input
            type="number"
            name="amount"
            min="0"
            step="5"
            required
            defaultValue={String(entry.amount)}
            autoFocus
            className="field-input mt-0 w-28 text-right"
          />
          <button type="submit" disabled={isUpdating} className="btn-primary py-1.5 text-xs">
            {isUpdating ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setUpdateError(null);
            }}
            disabled={isUpdating}
            className="btn-ghost py-1.5 text-xs"
          >
            Cancelar
          </button>
        </form>
        {updateError && (
          <p className="mt-2 text-xs text-danger" role="alert">
            {updateError}
          </p>
        )}
      </li>
    );
  }

  const StatusIcon = entry.received ? Check : Clock;
  const statusColor = entry.received ? "text-accent" : "text-muted";

  return (
    <li
      className={
        "flex items-center gap-3 px-3 py-2.5 " +
        (isHighlighted ? "bg-accent-soft" : "")
      }
    >
      <StatusIcon className={`h-5 w-5 shrink-0 ${statusColor}`} strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium text-fg">{entry.name}</span>
          <span className="text-muted">
            {" "}— {brlFormatter.format(entry.amount)}
          </span>
        </p>
        <p className="text-xs text-muted">
          Esperado em {dateFormatter.format(new Date(entry.expected_date))}
        </p>
      </div>

      <button
        type="button"
        onClick={handleToggleReceived}
        disabled={isToggling || noEdit}
        className={
          "flex items-center gap-1.5 text-xs font-medium " +
          statusColor +
          (!noEdit && !isToggling ? " hover:opacity-80" : "") +
          " disabled:cursor-default"
        }
        title={
          noEdit
            ? undefined
            : entry.received
              ? "Marcar como pendente"
              : "Marcar como recebido"
        }
      >
        <TrendingUp className="h-4 w-4" strokeWidth={2} />
        {isToggling ? "…" : entry.received ? "Recebido" : "Pendente"}
      </button>

      {!noEdit && (
        <div className="flex items-center gap-0.5">
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
