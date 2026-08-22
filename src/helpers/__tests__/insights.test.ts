import { describe, expect, it } from "vitest";
import {
  averageBuckets,
  computeInsights,
  DEFAULT_IDEAL_SETTINGS,
} from "../insights";
import type { BucketAverages } from "../types";

const month = (bills: number, expenses: number, mortgage = 0) => ({
  bills,
  expenses,
  mortgage,
});

describe("averageBuckets", () => {
  it("reports no data for an empty window rather than dividing by zero", () => {
    const avg = averageBuckets({ monthsUsed: 0, incomeTotal: 0, months: [] });
    expect(avg).toEqual({
      monthsUsed: 0,
      avgIncome: 0,
      avgBills: 0,
      avgExpenses: 0,
      avgMortgage: 0,
    });
  });

  it("averages over the months actually used", () => {
    const avg = averageBuckets({
      monthsUsed: 3,
      incomeTotal: 30000,
      months: [month(1000, 300), month(2000, 600), month(3000, 900)],
    });
    expect(avg.avgIncome).toBe(10000);
    expect(avg.avgBills).toBe(2000);
    expect(avg.avgExpenses).toBe(600);
  });

  it("reports no parcela for a space with no Financiamento", () => {
    const avg = averageBuckets({
      monthsUsed: 2,
      incomeTotal: 0,
      months: [month(1000, 0), month(1000, 0)],
    });
    expect(avg.avgMortgage).toBe(0);
  });

  it("averages the parcela across the window, not across the months it appears in", () => {
    // A loan starting halfway through a four-month window: two months of
    // 3000 spread over four is 1500, not 3000.
    const avg = averageBuckets({
      monthsUsed: 4,
      incomeTotal: 0,
      months: [
        month(1000, 0, 0),
        month(1000, 0, 0),
        month(4000, 0, 3000),
        month(4000, 0, 3000),
      ],
    });
    expect(avg.avgMortgage).toBe(1500);
  });

  it("counts the parcela inside the Contas average as well", () => {
    // The month totals already include it — avgMortgage is a subset of
    // avgBills, not something to add on top.
    const avg = averageBuckets({
      monthsUsed: 2,
      incomeTotal: 0,
      months: [month(4000, 0, 3000), month(4000, 0, 3000)],
    });
    expect(avg.avgBills).toBe(4000);
    expect(avg.avgMortgage).toBe(3000);
  });
});

const averages = (over: Partial<BucketAverages> = {}): BucketAverages => ({
  monthsUsed: 6,
  avgIncome: 10000,
  avgBills: 4000,
  avgExpenses: 1000,
  avgMortgage: 0,
  ...over,
});

function card(all: ReturnType<typeof computeInsights>, key: string) {
  const found = all.find((i) => i.key === key);
  if (!found) throw new Error(`no card for ${key}`);
  return found;
}

describe("computeInsights", () => {
  it("compares the leftover against the savings target", () => {
    const all = computeInsights(averages(), DEFAULT_IDEAL_SETTINGS);
    const savings = card(all, "recommendedSavings");
    expect(savings.target).toBe(2000);
    expect(savings.actual).toBe(5000);
    expect(savings.meets).toBe(true);
  });

  it("treats savings as a floor", () => {
    const all = computeInsights(
      averages({ avgBills: 8000 }),
      DEFAULT_IDEAL_SETTINGS
    );
    expect(card(all, "recommendedSavings").meets).toBe(false);
  });

  it("treats fixed expenses as a cap", () => {
    const under = computeInsights(averages(), DEFAULT_IDEAL_SETTINGS);
    expect(card(under, "maxFixedExpenses").meets).toBe(true);

    const over = computeInsights(
      averages({ avgBills: 6000 }),
      DEFAULT_IDEAL_SETTINGS
    );
    expect(card(over, "maxFixedExpenses").meets).toBe(false);
  });

  describe("the housing card", () => {
    it("compares the parcela against the housing cap", () => {
      const all = computeInsights(
        averages({ avgMortgage: 2000 }),
        DEFAULT_IDEAL_SETTINGS
      );
      const mortgage = card(all, "maxMortgage");
      expect(mortgage.target).toBe(3000);
      expect(mortgage.actual).toBe(2000);
      expect(mortgage.meets).toBe(true);
    });

    it("fails when the parcela exceeds the cap", () => {
      const all = computeInsights(
        averages({ avgMortgage: 4000 }),
        DEFAULT_IDEAL_SETTINGS
      );
      expect(card(all, "maxMortgage").meets).toBe(false);
    });

    it("passes with no Financiamento at all", () => {
      const all = computeInsights(averages(), DEFAULT_IDEAL_SETTINGS);
      expect(card(all, "maxMortgage").actual).toBe(0);
      expect(card(all, "maxMortgage").meets).toBe(true);
    });
  });

  it("sizes the emergency fund off total monthly spend", () => {
    const all = computeInsights(averages(), DEFAULT_IDEAL_SETTINGS);
    // (4000 + 1000) * 6
    expect(card(all, "emergencyFund").target).toBe(30000);
  });

  it("sizes financial freedom off annual spend", () => {
    const all = computeInsights(averages(), DEFAULT_IDEAL_SETTINGS);
    // (4000 + 1000) * 12 * 25
    expect(card(all, "financialFreedom").target).toBe(1500000);
  });

  it("reports every figure as zero for a space with no history", () => {
    const all = computeInsights(
      {
        monthsUsed: 0,
        avgIncome: 0,
        avgBills: 0,
        avgExpenses: 0,
        avgMortgage: 0,
      },
      DEFAULT_IDEAL_SETTINGS
    );
    expect(all.every((i) => i.target === 0)).toBe(true);
  });
});
