import { describe, expect, it } from "vitest";
import { formatCredits, formatDuration, formatMessageTime } from "@/lib/format";

describe("formatCredits", () => {
  it.each([
    ["0", "0.00M"],
    ["5880", "0.01M"],
    ["20000", "0.02M"],
    ["420000", "0.42M"],
    ["210800", "0.21M"],
    ["29994120", "29.99M"],
    ["30000000", "30.00M"],
  ])("renders %s microcredits as %s", (input, expected) => {
    expect(formatCredits(input)).toBe(expected);
  });

  it("keeps four decimals for a plan estimate", () => {
    expect(formatCredits("210800", 4)).toBe("0.2108M");
  });

  it("rounds rather than truncates, so a real charge never reads as free", () => {
    expect(formatCredits("5000")).toBe("0.01M");
    expect(formatCredits("4999")).toBe("0.00M");
  });

  it("keeps full precision on a balance no double can hold exactly", () => {
    expect(formatCredits("9007199254740993", 6)).toBe("9007199254.740993M");
  });

  it("renders a refund with its sign", () => {
    expect(formatCredits("-5880")).toBe("-0.01M");
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
