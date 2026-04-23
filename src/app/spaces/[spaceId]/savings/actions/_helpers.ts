// Shared helpers for the savings route's server actions. Not a
// "use server" file — only sync utilities and type exports live here.

export type FundFields = {
  name: string;
  startingBalance: number;
};

export function parseFundFields(formData: FormData): FundFields {
  const name = formData.get("name")?.toString().trim();
  const startingBalanceRaw = formData.get("starting_balance")?.toString();

  if (!name) throw new Error("Name is required");

  let startingBalance = 0;
  if (startingBalanceRaw) {
    startingBalance = Number(startingBalanceRaw);
    if (!Number.isFinite(startingBalance) || startingBalance < 0) {
      throw new Error("Starting balance must be a non-negative number");
    }
  }

  return { name, startingBalance };
}

export type ContributionFields = {
  signedAmount: number;           // positive = deposit, negative = withdraw
  date: string;                   // "YYYY-MM-DD"
  year: number;                   // derived from date for revalidation
  month: number;                  // derived from date for revalidation
  notes: string | null;
};

// Parse a contribution payload. The UI offers two buttons — "Deposit"
// and "Withdraw" — which set the `type` field; amount is always a
// positive number and we apply the sign here. The form includes a
// native <input type="month"> which yields "YYYY-MM"; we canonicalize
// to the first of that month since contributions aren't tied to a
// specific calendar day.
export function parseContributionFields(
  formData: FormData
): ContributionFields {
  const amountRaw = formData.get("amount")?.toString();
  const type = formData.get("type")?.toString();
  const monthRaw = formData.get("month")?.toString();
  const notesRaw = formData.get("notes")?.toString().trim();

  if (!amountRaw) throw new Error("Amount is required");
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  if (type !== "deposit" && type !== "withdraw") {
    throw new Error("Type must be 'deposit' or 'withdraw'");
  }
  const signedAmount = type === "deposit" ? amount : -amount;

  if (!monthRaw || !/^\d{4}-\d{2}$/.test(monthRaw)) {
    throw new Error("Month is required");
  }
  const [yStr, mStr] = monthRaw.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid month");
  }

  return {
    signedAmount,
    date: `${monthRaw}-01`,
    year,
    month,
    notes: notesRaw ? notesRaw : null,
  };
}
