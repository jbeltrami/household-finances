import type { CategoryRow } from "@/helpers/taxonomy";

export type BillTemplate = {
  id: string;
  name: string;
  default_amount: number | string;
  currency: string;
  category_id: string | null;
  // Resolved by the page so rows can render name/icon/colour without a
  // second lookup. null covers both "no Categoria" and "the Categoria is
  // deactivated and therefore not in the active list".
  category: CategoryRow | null;
  icon: string | null;
  active: boolean;
  cadence: string;
  due_day: number | null;
  day_of_week: number | null;
  installments_total: number | null;
  installments_start_month: string | null;
};
