export type BillTemplate = {
  id: string;
  name: string;
  default_amount: number | string;
  currency: string;
  due_day: number | null;
};
