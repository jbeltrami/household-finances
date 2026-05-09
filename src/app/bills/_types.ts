export type BillTemplate = {
  id: string;
  name: string;
  default_amount: number | string;
  currency: string;
  category: string | null;
  cadence: string;
  due_day: number | null;
  day_of_week: number | null;
  installments_total: number | null;
  installments_start_month: string | null;
};
