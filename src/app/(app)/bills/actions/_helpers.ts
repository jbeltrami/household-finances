// Shared helpers for bill-template server actions. Not a "use server"
// file — exports synchronous utilities and types.

import { isBillIconKey } from "@/lib/icons/bills";

// Postgres error code for unique_violation (our partial unique index
// on active template names).
export const UNIQUE_VIOLATION = "23505";

export type TemplateFields = {
  name: string;
  defaultAmount: number;
  categoryId: string | null;
  icon: string | null;
  cadence: "monthly" | "weekly" | "biweekly";
  dueDay: number | null;
  dayOfWeek: number | null;
  installmentsTotal: number | null;
  installmentsStartMonth: string | null;
};

export function parseTemplateFields(formData: FormData): TemplateFields {
  const name = formData.get("name")?.toString().trim();
  const defaultAmountRaw = formData.get("default_amount")?.toString();
  const cadenceRaw = formData.get("cadence")?.toString() ?? "monthly";

  if (!name) throw new Error("O nome é obrigatório");
  if (!defaultAmountRaw) throw new Error("O valor padrão é obrigatório");

  const defaultAmount = Number(defaultAmountRaw);
  if (!Number.isFinite(defaultAmount) || defaultAmount < 0) {
    throw new Error("O valor padrão precisa ser um número positivo");
  }

  if (
    cadenceRaw !== "monthly" &&
    cadenceRaw !== "weekly" &&
    cadenceRaw !== "biweekly"
  ) {
    throw new Error("A recorrência precisa ser mensal, semanal ou quinzenal");
  }
  const cadence = cadenceRaw;

  let dueDay: number | null = null;
  let dayOfWeek: number | null = null;

  if (cadence === "monthly") {
    const dueDayRaw = formData.get("due_day")?.toString();
    if (dueDayRaw) {
      dueDay = Number(dueDayRaw);
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        throw new Error("O dia de vencimento precisa ser um número entre 1 e 31");
      }
    }
  } else {
    const dowRaw = formData.get("day_of_week")?.toString();
    if (dowRaw == null || dowRaw === "") {
      throw new Error("O dia da semana é obrigatório para contas semanais ou quinzenais");
    }
    dayOfWeek = Number(dowRaw);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error("O dia da semana precisa ser de 0 (Dom) a 6 (Sáb)");
    }
  }

  let installmentsTotal: number | null = null;
  let installmentsStartMonth: string | null = null;

  const installmentsEnabled = formData.get("installments_enabled") === "on";
  if (installmentsEnabled) {
    if (cadence !== "monthly") {
      throw new Error("Parcelamento só é suportado em contas mensais");
    }
    const totalRaw = formData.get("installments_total")?.toString();
    const startRaw = formData.get("installments_start_month")?.toString();

    if (!totalRaw) throw new Error("A quantidade de parcelas é obrigatória");
    if (!startRaw) throw new Error("O mês inicial é obrigatório");

    installmentsTotal = Number(totalRaw);
    if (!Number.isInteger(installmentsTotal) || installmentsTotal <= 0) {
      throw new Error("A quantidade de parcelas precisa ser um número inteiro positivo");
    }

    if (!/^\d{4}-\d{2}$/.test(startRaw)) {
      throw new Error("O mês inicial precisa ser um valor YYYY-MM válido");
    }
    installmentsStartMonth = `${startRaw}-01`;
  }

  // Icon: optional, must be a registered key when set. We reject any
  // unknown key so we don't end up storing junk that the renderer will
  // silently fall back on.
  //
  // The icon no longer derives the Categoria. It used to — `categoryFor(icon)`
  // wrote the old `category` text column on every save, which meant picking a
  // wifi icon silently filed the Conta under "Moradia" and an ordinary edit
  // could overwrite a category the user had never seen. Categoria is now its
  // own field, and the legacy text column is deliberately left untouched here
  // so it survives as the record of what pre-migration rows used to say until
  // 0013 drops it.
  const iconRaw = formData.get("icon")?.toString().trim();
  let icon: string | null = null;
  if (iconRaw) {
    if (!isBillIconKey(iconRaw)) {
      throw new Error("Ícone inválido");
    }
    icon = iconRaw;
  }

  // Empty string is what an unselected <select> submits; treat it as null
  // rather than trying to insert "" into a uuid column.
  const categoryRaw = formData.get("category_id")?.toString().trim();
  const categoryId = categoryRaw ? categoryRaw : null;

  return {
    name,
    defaultAmount,
    categoryId,
    icon,
    cadence,
    dueDay,
    dayOfWeek,
    installmentsTotal,
    installmentsStartMonth,
  };
}

// Compute the biweekly anchor: the next occurrence of `dayOfWeek` on
// or after today. Sets the phase for biweekly billing — all future/
// past biweekly dates are computed in 14-day steps from this anchor.
export function computeBiweeklyAnchor(dayOfWeek: number): string {
  const today = new Date();
  let daysUntil = dayOfWeek - today.getDay();
  if (daysUntil < 0) daysUntil += 7;
  const target = new Date(today);
  target.setDate(target.getDate() + daysUntil);
  const yyyy = String(target.getFullYear()).padStart(4, "0");
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
