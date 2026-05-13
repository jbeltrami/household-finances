"use client";

import { useState, useTransition } from "react";
import { Pencil, RotateCcw, SkipForward } from "lucide-react";
import BillIcon from "@/components/BillIcon";
import { brlFormatter } from "@/helpers/format";
import {
  overrideEntryAmount,
  skipEntryOccurrence,
  toggleEntryPaid,
  deleteEntry,
  type OverrideAmountTarget,
  type SkipTarget,
  type TogglePaidTarget,
} from "../../actions";
import type { EntryRow } from "../../_types";

type Props = {
  entry: EntryRow;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
};

function togglePaidTargetFor(entry: EntryRow): TogglePaidTarget {
  if (entry.id != null) return { kind: "materialized", entryId: entry.id };
  return {
    kind: "virtual",
    templateId: entry.template_id!,
    date: entry.date,
    spaceId: entry.space_id,
  };
}

function overrideTargetFor(entry: EntryRow): OverrideAmountTarget {
  if (entry.id != null) return { kind: "materialized", entryId: entry.id };
  return {
    kind: "virtual",
    templateId: entry.template_id!,
    date: entry.date,
    spaceId: entry.space_id,
  };
}

function skipTargetFor(entry: EntryRow): SkipTarget {
  if (entry.id != null) return { kind: "materialized", entryId: entry.id };
  return {
    kind: "virtual",
    templateId: entry.template_id!,
    date: entry.date,
    spaceId: entry.space_id,
  };
}

// Render only the day-and-month portion of a YYYY-MM-DD string, e.g. "14/05".
// Used for the compact "Vence em DD/MM" label.
function formatShortDate(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

export default function BillInstanceRow({
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

  const progress = entry.installmentProgress;
  const isInstallment = progress != null;
  const [coverInput, setCoverInput] = useState(1);

  const dueDay = parseInt(entry.date.split("-")[2], 10);
  const isHighlighted =
    highlightedDay !== null && dueDay === highlightedDay;

  const [isToggling, startToggle] = useTransition();
  const handleTogglePaid = (coveredOverride?: number) => {
    startToggle(async () => {
      const covered = coveredOverride ?? coverInput;
      await toggleEntryPaid(
        togglePaidTargetFor(entry),
        !entry.paid,
        entry.paid ? 1 : covered,
        new FormData()
      );
    });
  };

  const [isUpdating, startUpdate] = useTransition();
  const handleUpdate = (formData: FormData) => {
    startUpdate(async () => {
      const result = await overrideEntryAmount(
        overrideTargetFor(entry),
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

  const [isSkipping, startSkip] = useTransition();
  const handleSkip = () => {
    if (!window.confirm(`Ignorar "${entry.name}" nesta ocorrência?`)) return;
    startSkip(async () => {
      await skipEntryOccurrence(skipTargetFor(entry), new FormData());
    });
  };

  const [isReverting, startRevert] = useTransition();
  const handleRevert = () => {
    if (entry.id == null) return;
    if (!window.confirm(`Reverter o valor sobrescrito de "${entry.name}"?`))
      return;
    startRevert(async () => {
      await deleteEntry(entry.id!);
    });
  };

  const progressBadge = progress ? `${progress.paid}/${progress.total}` : null;
  const showCoverInput =
    isInstallment &&
    !entry.paid &&
    !noEdit &&
    progress != null &&
    progress.remaining > 1;
  const maxCover = progress?.remaining ?? 1;

  // Materialized entries that aren't paid/skipped are overrides — offer
  // a "revert" affordance via deleteEntry so the row returns to virtual
  // state (template default amount).
  const showRevert =
    entry.id != null && !entry.paid && entry.template_id != null && !noEdit;

  if (editing && !noEdit) {
    return (
      <li className="px-3 py-3">
        <form
          action={handleUpdate}
          className="flex flex-wrap items-center gap-2"
        >
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
          <button
            type="submit"
            disabled={isUpdating}
            className="btn-primary py-1.5 text-xs"
          >
            {isUpdating ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
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

  return (
    <li
      className={
        "grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 " +
        (isHighlighted ? "bg-accent-soft" : "")
      }
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-fg"
        aria-hidden="true"
      >
        <BillIcon iconKey={entry.icon} className="h-4 w-4" />
      </span>

      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-medium text-fg">
          <span>{entry.name}</span>
          {progressBadge && (
            <span
              className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted"
              title="Parcelas pagas / total"
            >
              {progressBadge}
            </span>
          )}
        </p>
        {entry.paid && entry.installments_covered > 1 && (
          <p className="text-xs text-muted">
            ×{entry.installments_covered} parcelas neste mês
          </p>
        )}
      </div>

      <p className="hidden text-xs text-muted sm:block">
        Vence em {formatShortDate(entry.date)}
      </p>

      <p className="text-sm font-medium text-fg">
        {brlFormatter.format(entry.amount)}
      </p>

      <div className="flex items-center gap-2">
        {showCoverInput && (
          <div className="flex items-center gap-1 text-xs text-muted">
            <span>cobre</span>
            <input
              type="number"
              min={1}
              max={maxCover}
              value={coverInput}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= 1 && n <= maxCover) {
                  setCoverInput(n);
                }
              }}
              className="w-12 rounded-md border border-subtle bg-canvas px-1 py-0.5 text-center text-xs text-fg focus:border-accent focus:outline-none"
            />
            {maxCover > 1 && coverInput < maxCover && (
              <button
                type="button"
                onClick={() => handleTogglePaid(maxCover)}
                disabled={isToggling}
                className="btn-ghost px-1.5 py-0.5 text-xs"
                title={`Pagar todas as ${maxCover} restantes`}
              >
                todas
              </button>
            )}
          </div>
        )}

        {noEdit ? (
          <span className={entry.paid ? "pill-paid" : "pill-pending"}>
            {entry.paid ? "Pago" : "Pendente"}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => handleTogglePaid()}
            disabled={isToggling}
            className={
              (entry.paid ? "pill-paid" : "pill-pending") +
              " transition-opacity hover:opacity-80 disabled:animate-pulse"
            }
            title={entry.paid ? "Marcar como pendente" : "Marcar como pago"}
          >
            {isToggling ? "…" : entry.paid ? "Pago" : "Pendente"}
          </button>
        )}

        {!noEdit && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Editar valor"
              data-tooltip="Editar valor"
            >
              <Pencil className="h-4 w-4" strokeWidth={2} />
            </button>
            {!entry.paid && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={isSkipping}
                className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50"
                aria-label="Ignorar esta ocorrência"
                data-tooltip="Ignorar esta ocorrência"
              >
                <SkipForward className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            {showRevert && (
              <button
                type="button"
                onClick={handleRevert}
                disabled={isReverting}
                className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                aria-label="Reverter valor sobrescrito"
                data-tooltip="Voltar ao valor padrão"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
