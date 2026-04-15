// Row types for the savings route. A fund's running total is derived
// on the server (starting_balance + sum of contributions) and flowed
// down to components as plain numbers, so the UI never has to repeat
// the math.

export type SavingsFundRow = {
  id: string;
  name: string;
  currency: string;
  starting_balance: number | string;
  totalContributions: number;
  runningTotal: number;
};

export type SavingsContributionRow = {
  id: string;
  amount: number | string;
  notes: string | null;
  month_id: string;
  year: number;
  month: number;
};
