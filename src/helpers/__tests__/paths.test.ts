import { describe, expect, it } from "vitest";
import { baseUrlFrom } from "../paths";

describe("baseUrlFrom", () => {
  it("trusts the forwarded protocol when the proxy sets one", () => {
    expect(baseUrlFrom("app.example.com", "https")).toBe(
      "https://app.example.com"
    );
  });

  // Local dev has no proxy setting the header, and an https:// link to
  // localhost is a dead link in the email you are trying to preview.
  it("falls back to http for localhost and https for anything else", () => {
    expect(baseUrlFrom("localhost:3000", null)).toBe("http://localhost:3000");
    expect(baseUrlFrom("app.example.com", null)).toBe(
      "https://app.example.com"
    );
  });

  // Null rather than a throw or a guessed origin: a cron answers a missing
  // host with a 400 and a server action with an inline error, and neither
  // should be mailing links to a hostname nobody supplied.
  it("is null with no host, leaving the response to the caller", () => {
    expect(baseUrlFrom(null, "https")).toBeNull();
  });
});
