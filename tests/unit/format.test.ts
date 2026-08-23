import { describe, expect, it } from "vitest";
import {
  CREDIT_DIGITS,
  formatCredits,
  formatDuration,
  formatMessageTime,
  formatRelativeTime,
  formatUsageCredits,
  formatUsagePeriod,
  formatUsageTimestamp,
} from "@/lib/format";

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

describe("formatUsageCredits", () => {
  it.each([
    ["4940000", "4.94M"],
    ["80000", "0.08M"],
    ["30000000", "30.00M"],
    ["420000", "0.42M"],
    ["40000", "0.04M"],
    ["10000", "0.01M"],
  ])("renders %s microcredits as %s, matching the captured table strings", (input, expected) => {
    expect(formatUsageCredits(input)).toBe(expected);
  });

  it("widens to four decimals below 0.01 credits, so a cheap call still reads as a cost", () => {
    expect(formatUsageCredits("5000")).toBe("0.0050M");
    expect(formatUsageCredits("5900")).toBe("0.0059M");
    expect(formatUsageCredits("0")).toBe("0.0000M");
  });
});

describe("formatUsagePeriod", () => {
  it("writes the window the way the dashboard's cards do", () => {
    expect(formatUsagePeriod("2026-08-21T12:00:00.000Z", "2026-09-20T12:00:00.000Z")).toBe(
      "Aug 21, 2026 - Sep 20, 2026",
    );
  });
});

describe("formatUsageTimestamp", () => {
  it("renders a numeric date with seconds", () => {
    expect(formatUsageTimestamp("2026-08-23T03:49:21.000Z")).toMatch(
      /^\d{1,2}\/\d{1,2}\/2026, \d{1,2}:\d{2}:\d{2} (AM|PM)$/,
    );
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
  const iso = "2026-08-22T14:53:00.000Z";

  it("renders 12-hour clock time for a message from today", () => {
    expect(formatMessageTime(iso, new Date(iso))).toMatch(/^\d{1,2}:\d{2}\s(AM|PM)$/);
  });

  it("renders the day for an older message, the way the reference shows `Aug 21`", () => {
    expect(formatMessageTime("2026-08-21T14:53:00.000Z", new Date(iso))).toBe("Aug 21");
  });

  it("adds the year once the message is from a different one", () => {
    expect(formatMessageTime("2025-08-21T14:53:00.000Z", new Date(iso))).toBe("Aug 21, 2025");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-08-22T12:00:00.000Z");

  it.each([
    ["2026-08-22T11:57:00.000Z", "3 minutes ago"],
    ["2026-08-22T11:00:00.000Z", "1 hour ago"],
    ["2026-08-22T08:00:00.000Z", "4 hours ago"],
    ["2026-08-21T12:00:00.000Z", "yesterday"],
    ["2026-08-19T12:00:00.000Z", "3 days ago"],
  ])("renders %s as %s", (iso, expected) => {
    expect(formatRelativeTime(iso, now)).toBe(expected);
  });

  it("says just now rather than 0 minutes ago for a row created by the send you just made", () => {
    expect(formatRelativeTime("2026-08-22T11:59:40.000Z", now)).toBe("just now");
  });
});
