"use client";

import { useState, useTransition } from "react";
import { Check, Clock, Pencil, TrendingUp, Trash2 } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput/CurrencyInput";
import { brlFormatter, dateFormatter } from "@/helpers/format";
import {
  deleteIncomeEntry,
  toggleIncomeReceived,
  updateIncomeEntry,
} from "../../actions";
import type { IncomeRow } from "../../_types";
import CategorySelect from "@/components/CategorySelect/CategorySelect";
import PayerSelect from "@/components/PayerSelect/PayerSelect";
import PayerChip from "@/components/PayerChip";
import type { CategoryRow, PayerRow } from "@/helpers/taxonomy";
import { incomeDisplayLabel } from "@/helpers/format";

type Props = {
  categories: CategoryRow[];
  payers: PayerRow[];
  entry: IncomeRow;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
};

export default function IncomeEntryRow({
  categories,
  payers,
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
    if (!window.confirm(`Excluir "${incomeDisplayLabel(entry)}"?`)) return;
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
            placeholder="Descrição (opcional)"
            defaultValue={entry.name ?? ""}
            className="field-input mt-0 min-w-32 flex-1"
          />
          <div className="w-40">
            <PayerSelect payers={payers} current={entry.payer} />
          </div>
          <div className="w-40">
            <CategorySelect categories={categories} current={entry.category} />
          </div>
          <CurrencyInput
            name="amount"
            required
            autoFocus
            defaultValue={String(entry.amount)}
            wrapperClassName="relative w-36"
            className="mt-0"
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
        "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 " +
        (isHighlighted ? "bg-accent-soft" : "")
      }
    >
      <StatusIcon className={`h-5 w-5 shrink-0 ${statusColor}`} strokeWidth={2} />
      {entry.payer && (
        <PayerChip
          name={entry.payer.name}
          color={entry.payer.color}
          className="h-7 w-7"
        />
      )}
      <div className="min-w-32 flex-1">
        <p className="text-sm font-medium text-fg">
          {incomeDisplayLabel(entry)}
        </p>
        <p className="text-xs text-muted">
          Esperado em {dateFormatter.format(new Date(entry.expected_date))}
          {/* Only shown when the name already used them up — otherwise the
              headline is these two fields and repeating them is noise. */}
          {entry.name && entry.payer ? ` · ${entry.payer.name}` : ""}
          {entry.name && entry.category ? ` · ${entry.category.name}` : ""}
        </p>
      </div>

      <p className="shrink-0 text-sm font-medium text-fg">
        {brlFormatter.format(entry.amount)}
      </p>

      <div className="ml-auto flex shrink-0 items-center gap-2">
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
      </div>
    </li>
  );
}
