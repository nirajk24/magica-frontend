import { describe, expect, it } from "vitest";
import { CREDIT_DIGITS, formatCredits, formatDuration, formatMessageTime } from "@/lib/format";

describe("formatCredits", () => {
  it.each([
    ["0", "0.00M"],
    ["10400", "0.010M"],
    ["420000", "0.42M"],
    ["580000", "0.58M"],
    ["300000", "0.30M"],
    ["210800", "0.21M"],
    ["160000", "0.16M"],
  ])("renders %s microcredits as %s, matching the captured strings", (input, expected) => {
    expect(formatCredits(input)).toBe(expected);
  });

  it("keeps two significant digits rather than two decimals, so cheap calls stay distinct", () => {
    expect(formatCredits("5880")).toBe("0.0059M");
    expect(formatCredits("588")).toBe("0.00059M");
    expect(formatCredits("5880")).not.toBe(formatCredits("588"));
  });

  it("renders a balance to four significant digits", () => {
    expect(formatCredits("29994120", CREDIT_DIGITS.balance)).toBe("29.99M");
    expect(formatCredits("28300000", CREDIT_DIGITS.balance)).toBe("28.30M");
    expect(formatCredits("30000000", CREDIT_DIGITS.balance)).toBe("30.00M");
  });

  it("renders a plan estimate to four significant digits", () => {
    expect(formatCredits("210800", CREDIT_DIGITS.balance)).toBe("0.2108M");
    expect(formatCredits("3402000", CREDIT_DIGITS.balance)).toBe("3.402M");
    expect(formatCredits("164700", CREDIT_DIGITS.balance)).toBe("0.1647M");
  });

  it("does not gain a digit when rounding carries into a new power of ten", () => {
    expect(formatCredits("99900")).toBe("0.10M");
    expect(formatCredits("9990000")).toBe("10M");
  });

  it("keeps full precision on a balance no double can hold exactly", () => {
    expect(formatCredits("9007199254740993", 16)).toBe("9007199254.740993M");
  });

  it("renders a refund with its sign", () => {
    expect(formatCredits("-5880")).toBe("-0.0059M");
  });
});

describe("formatDuration", () => {
  it.each([
    [7, "7ms"],
    [110, "110ms"],
    [999, "999ms"],
    [1_000, "1.0s"],
    [3_700, "3.7s"],
    [5_600, "5.6s"],
    [8_412, "8.4s"],
    [9_300, "9.3s"],
    [65_000, "1m 5s"],
    [265_000, "4m 25s"],
  ])("renders %ims as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe("formatMessageTime", () => {
  it("renders 12-hour clock time regardless of the viewer's locale", () => {
    expect(formatMessageTime("2026-08-22T14:53:00.000Z")).toMatch(/^\d{1,2}:\d{2}\s(AM|PM)$/);
  });
});
