// Amortization engine — the single source of truth for a financing's
// schedule. Pure TypeScript (no server/Supabase deps) so it runs equally
// in the simulator (client) and in server-side monthly resolution.
//
// The schedule is COMPUTED, never stored: it's a deterministic function of
// the stored parameters plus any recorded extra payments. SAC keeps the
// amortization constant (decreasing payment); Price keeps the payment
// constant (the classic Tabela Price / PMT).

import { addMonthsToYmd } from "./date";

export type AmortizationSystem = "sac" | "price";
export type RatePeriod = "monthly" | "annual";
export type ExtraPaymentEffect = "reduce_term" | "reduce_installment";

export type AmortizationInput = {
  principal: number;
  ratePercent: number; // as entered (e.g. 9.5 for 9.5%)
  ratePeriod: RatePeriod;
  system: AmortizationSystem;
  startDate: string; // "YYYY-MM-DD"
  installments: number;
};

export type ExtraPaymentInput = {
  date: string; // "YYYY-MM-DD"
  amount: number;
  effect: ExtraPaymentEffect;
};

export type ScheduleRow = {
  number: number;
  date: string; // "YYYY-MM-DD"
  payment: number; // prestação (amortização + juros)
  interest: number; // juros
  amortization: number; // amortização ordinária da parcela
  extraApplied: number; // amortização extraordinária aplicada no mês (0 se nenhuma)
  balanceAfter: number; // saldo devedor após a parcela
};

export type Schedule = {
  rows: ScheduleRow[];
  totals: {
    paid: number; // total pago (juros + principal + extras)
    interest: number; // total de juros
    principal: number; // principal financiado
    extra: number; // total de amortizações extraordinárias
  };
};

// Convert the entered rate to a monthly fraction. Annual rates use the
// effective (compound) conversion, the Brazilian convention for SAC/Price.
export function monthlyRate(ratePercent: number, ratePeriod: RatePeriod): number {
  const r = ratePercent / 100;
  if (ratePeriod === "monthly") return r;
  return Math.pow(1 + r, 1 / 12) - 1;
}

// Constant Price payment for a balance over `remaining` installments.
function pricePayment(balance: number, i: number, remaining: number): number {
  if (remaining <= 0) return balance;
  if (i === 0) return balance / remaining;
  return (balance * i) / (1 - Math.pow(1 + i, -remaining));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Build the full schedule. Extra payments are matched to the installment
// whose month they fall in and applied after that month's ordinary
// amortization. Effect of each extra:
//   - reduce_term: keep the payment basis; the loan simply ends earlier.
//   - reduce_installment: recompute the basis over the installments
//     remaining until the original term, lowering future payments.
// (Mixing both across payments is supported; reduce_installment always
//  re-targets the original final installment.)
export function buildSchedule(
  input: AmortizationInput,
  extras: ExtraPaymentInput[] = []
): Schedule {
  const i = monthlyRate(input.ratePercent, input.ratePeriod);
  const n = Math.max(1, Math.floor(input.installments));
  const EPS = 0.005; // half a cent — treat as fully paid
  const plannedEnd = n;

  // Group extras by "YYYY-MM" for per-installment lookup.
  const extrasByYm = new Map<string, ExtraPaymentInput[]>();
  for (const e of extras) {
    const ym = e.date.slice(0, 7);
    const list = extrasByYm.get(ym) ?? [];
    list.push(e);
    extrasByYm.set(ym, list);
  }

  let balance = input.principal;
  let pmt = input.system === "price" ? pricePayment(balance, i, n) : 0;
  let sacAmort = input.system === "sac" ? input.principal / n : 0;

  const rows: ScheduleRow[] = [];
  let totalPaid = 0;
  let totalInterest = 0;
  let totalExtra = 0;

  const SAFETY = n + 600; // backstop against pathological loops
  let k = 0;
  while (balance > EPS && k < SAFETY) {
    k += 1;
    const date = addMonthsToYmd(input.startDate, k - 1);
    const interest = balance * i;

    let amort = input.system === "price" ? pmt - interest : sacAmort;
    if (amort < 0) amort = 0;
    if (amort > balance) amort = balance; // final-installment clamp
    const payment = amort + interest;
    balance -= amort;

    // Apply any extra payments dated in this installment's month.
    let extraApplied = 0;
    const monthExtras = extrasByYm.get(date.slice(0, 7));
    if (monthExtras) {
      for (const e of monthExtras) {
        const applied = Math.min(e.amount, balance);
        balance -= applied;
        extraApplied += applied;

        const remaining = plannedEnd - k;
        if (balance > EPS && remaining > 0 && e.effect === "reduce_installment") {
          if (input.system === "price") {
            pmt = pricePayment(balance, i, remaining);
          } else {
            sacAmort = balance / remaining;
          }
        }
        // reduce_term: basis unchanged; the loop ends earlier on its own.
      }
    }

    totalPaid += payment + extraApplied;
    totalInterest += interest;
    totalExtra += extraApplied;

    rows.push({
      number: k,
      date,
      payment: round2(payment),
      interest: round2(interest),
      amortization: round2(amort),
      extraApplied: round2(extraApplied),
      balanceAfter: round2(Math.max(0, balance)),
    });
  }

  return {
    rows,
    totals: {
      paid: round2(totalPaid),
      interest: round2(totalInterest),
      principal: round2(input.principal),
      extra: round2(totalExtra),
    },
  };
}
