export type BillTemplate = {
  id: string;
  name: string;
  default_amount: number | string;
  currency: string;
  cadence: string;
  due_day: number | null;
  day_of_week: number | null;
};
