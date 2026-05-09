// Shared helpers for bill-template server actions. Not a "use server"
// file — exports synchronous utilities and types.

// Postgres error code for unique_violation (our partial unique index
// on active template names).
export const UNIQUE_VIOLATION = "23505";

export type TemplateFields = {
  name: string;
  defaultAmount: number;
  category: string | null;
  cadence: "monthly" | "weekly" | "biweekly";
  dueDay: number | null;
  dayOfWeek: number | null;
  installmentsTotal: number | null;
  installmentsStartMonth: string | null;
};

export function parseTemplateFields(formData: FormData): TemplateFields {
  const name = formData.get("name")?.toString().trim();
  const defaultAmountRaw = formData.get("default_amount")?.toString();
  const categoryRaw = formData.get("category")?.toString().trim();
  const cadenceRaw = formData.get("cadence")?.toString() ?? "monthly";

  if (!name) throw new Error("Name is required");
  if (!defaultAmountRaw) throw new Error("Default amount is required");

  const defaultAmount = Number(defaultAmountRaw);
  if (!Number.isFinite(defaultAmount) || defaultAmount < 0) {
    throw new Error("Default amount must be a positive number");
  }

  if (
    cadenceRaw !== "monthly" &&
    cadenceRaw !== "weekly" &&
    cadenceRaw !== "biweekly"
  ) {
    throw new Error("Cadence must be monthly, weekly, or biweekly");
  }
  const cadence = cadenceRaw;

  let dueDay: number | null = null;
  let dayOfWeek: number | null = null;

  if (cadence === "monthly") {
    const dueDayRaw = formData.get("due_day")?.toString();
    if (dueDayRaw) {
      dueDay = Number(dueDayRaw);
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        throw new Error("Due day must be an integer between 1 and 31");
      }
    }
  } else {
    const dowRaw = formData.get("day_of_week")?.toString();
    if (dowRaw == null || dowRaw === "") {
      throw new Error("Day of week is required for weekly/biweekly bills");
    }
    dayOfWeek = Number(dowRaw);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error("Day of week must be 0 (Sun) through 6 (Sat)");
    }
  }

  let installmentsTotal: number | null = null;
  let installmentsStartMonth: string | null = null;

  const installmentsEnabled = formData.get("installments_enabled") === "on";
  if (installmentsEnabled) {
    if (cadence !== "monthly") {
      throw new Error("Installments are only supported for monthly bills");
    }
    const totalRaw = formData.get("installments_total")?.toString();
    const startRaw = formData.get("installments_start_month")?.toString();

    if (!totalRaw) throw new Error("Number of installments is required");
    if (!startRaw) throw new Error("Start month is required");

    installmentsTotal = Number(totalRaw);
    if (!Number.isInteger(installmentsTotal) || installmentsTotal <= 0) {
      throw new Error("Number of installments must be a positive integer");
    }

    if (!/^\d{4}-\d{2}$/.test(startRaw)) {
      throw new Error("Start month must be a valid YYYY-MM value");
    }
    installmentsStartMonth = `${startRaw}-01`;
  }

  return {
    name,
    defaultAmount,
    category: categoryRaw || null,
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
