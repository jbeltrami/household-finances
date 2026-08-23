import { describe, expect, it } from "vitest";
import {
  MANUAL_SEND_LIMIT,
  checkSendWindow,
} from "../rate-limit";

const NOW = new Date("2026-04-15T14:00:00.000Z");

// Minutes before NOW, as a Date — the tests read as "a send 20 minutes ago".
const agoMin = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000);

describe("checkSendWindow", () => {
  it("allows a send when nothing has gone out", () => {
    expect(checkSendWindow([], NOW)).toEqual({
      allowed: true,
      remaining: MANUAL_SEND_LIMIT,
    });
  });

  it("counts down the remaining allowance", () => {
    expect(checkSendWindow([agoMin(10)], NOW)).toEqual({
      allowed: true,
      remaining: 2,
    });
    expect(checkSendWindow([agoMin(10), agoMin(20)], NOW)).toEqual({
      allowed: true,
      remaining: 1,
    });
  });

  it("refuses the send after the limit is reached", () => {
    const verdict = checkSendWindow(
      [agoMin(10), agoMin(20), agoMin(30)],
      NOW
    );
    expect(verdict.allowed).toBe(false);
  });

  // The window slides. Per-clock-hour counting would let three at the end of
  // one hour and three at the start of the next arrive as six in two minutes.
  it("ignores sends that have aged past the hour", () => {
    expect(
      checkSendWindow([agoMin(61), agoMin(70), agoMin(200)], NOW)
    ).toEqual({ allowed: true, remaining: MANUAL_SEND_LIMIT });
  });

  it("counts only the sends still inside the window", () => {
    expect(
      checkSendWindow([agoMin(5), agoMin(90), agoMin(120)], NOW)
    ).toEqual({ allowed: true, remaining: 2 });
  });

  // Exactly an hour old is outside. Picked so that "three an hour" means a
  // fourth send is possible exactly one hour after the first, rather than one
  // millisecond later — the boundary a user would actually test.
  it("treats a send exactly one hour old as aged out", () => {
    expect(
      checkSendWindow([agoMin(60), agoMin(30), agoMin(20)], NOW)
    ).toEqual({ allowed: true, remaining: 1 });
  });

  // When refused, the user is told when to come back — which is the moment the
  // oldest send in the window ages out, not an hour from now.
  it("reports when the oldest send in the window ages out", () => {
    const verdict = checkSendWindow(
      [agoMin(50), agoMin(20), agoMin(10)],
      NOW
    );
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) throw new Error("expected a refusal");
    // Oldest is 50 minutes ago, so it leaves the window in 10 minutes.
    expect(verdict.retryAt.toISOString()).toBe("2026-04-15T14:10:00.000Z");
  });

  it("is not confused by the order the sends arrive in", () => {
    const verdict = checkSendWindow(
      [agoMin(10), agoMin(50), agoMin(20)],
      NOW
    );
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) throw new Error("expected a refusal");
    expect(verdict.retryAt.toISOString()).toBe("2026-04-15T14:10:00.000Z");
  });

  // With more sends in the window than the limit, waiting for the *oldest* to
  // age out is not enough — that only drops five to four. Enough of them have
  // to leave for the count to fall below the limit, so the answer is the third
  // oldest here, not the first. Getting this wrong tells the user to come back
  // at a time they would still be refused.
  it("waits for enough sends to age out, not just the oldest", () => {
    const verdict = checkSendWindow(
      [agoMin(5), agoMin(15), agoMin(25), agoMin(35), agoMin(45)],
      NOW
    );
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) throw new Error("expected a refusal");
    // Five in window, limit three: the 25-minute-old send is the one whose
    // departure brings the count to two.
    expect(verdict.retryAt.toISOString()).toBe("2026-04-15T14:35:00.000Z");
  });
});
