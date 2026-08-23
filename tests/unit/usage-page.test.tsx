import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsagePage } from "@/components/usage/UsagePage";
import { env } from "@/lib/env";
import { formatUsagePeriod } from "@/lib/format";
import { previousPeriodOf } from "@/queries/use-usage";
import { errors } from "../msw/handlers";
import { server } from "../msw/setup";
import { routerMock } from "../router-mock";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;
const currentPeriod = formatUsagePeriod(fixtures.usagePage.from, fixtures.usagePage.to);

describe("the usage overview", () => {
  it("renders the stat cards from the aggregation", async () => {
    renderWithProviders(<UsagePage />);

    expect(await screen.findByText("24.97M credits")).toBeInTheDocument();
    expect(screen.getByText("44")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText(currentPeriod)).toHaveLength(2);
  });

  it("lists every category with its total movement, newest activity first", async () => {
    renderWithProviders(<UsagePage />);

    const rows = within(await screen.findByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0]!.textContent)).toEqual([
      "AI Agent Chat",
      "AI Gpt Image 2",
      "AI Credit Adjustment",
    ]);

    expect(within(rows[0]!).getByText("4.94M")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("0.08M")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("30.00M")).toBeInTheDocument();
  });

  it("re-sorts when a column header is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsagePage />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: "Tool Name" }));

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0]!.textContent)).toEqual([
      "AI Agent Chat",
      "AI Credit Adjustment",
      "AI Gpt Image 2",
    ]);
  });

  it("moves the Show side into the URL, the way the reference does", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsagePage />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: /Debited Credits/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Credited Credits" }));

    expect(routerMock.replace).toHaveBeenCalledWith("/usage?show=credited", { scroll: false });
  });

  it("offers Previous Period, keeps Custom Period disabled, and refetches the earlier window", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsagePage />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: /Current Period/ }));

    const custom = await screen.findByRole("menuitem", { name: "Custom Period" });
    expect(custom).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("menuitem", { name: "Previous Period" }));

    expect(await screen.findByText("0.0000M credits")).toBeInTheDocument();
    expect(await screen.findByText("No usage in this period.")).toBeInTheDocument();
  });

  it("derives the previous window from the current page, not from the client's clock", () => {
    expect(previousPeriodOf(fixtures.usagePage)).toEqual({
      from: fixtures.usagePreviousPage.from,
      to: fixtures.usagePage.from,
    });
    expect(previousPeriodOf(undefined)).toBeNull();
  });
});

describe("the usage detailed view", () => {
  it("opens from a row's View details with that category's records", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsagePage />);

    const rows = within(await screen.findByRole("table")).getAllByRole("row").slice(1);
    await user.click(within(rows[1]!).getByRole("button", { name: /View details/ }));

    expect(await screen.findByText("AI Gpt Image 2 usage records")).toBeInTheDocument();
    expect(screen.getByText("6 records in the selected period")).toBeInTheDocument();
    expect(screen.getByText("Debited")).toBeInTheDocument();
    expect(await screen.findByText("0.01M")).toBeInTheDocument();
    expect(screen.getByText("0.0059M")).toBeInTheDocument();
  });

  it("switches categories through the picker and labels the credited side honestly", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsagePage />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("tab", { name: "Detailed View" }));
    expect(await screen.findByText("AI Agent Chat usage records")).toBeInTheDocument();
    expect(await screen.findByText("0.42M")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /AI Agent Chat - 4.94M/ }));
    await user.click(await screen.findByRole("menuitem", { name: /AI Credit Adjustment/ }));

    expect(await screen.findByText("AI Credit Adjustment usage records")).toBeInTheDocument();
    expect(screen.getByText("Credited")).toBeInTheDocument();
    expect(await screen.findByText("30.00M")).toBeInTheDocument();
  });

  it("keeps each record's step-cost drill-down visible but honest about why it is disabled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsagePage />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("tab", { name: "Detailed View" }));
    await screen.findByText("0.42M");

    const recordActions = screen.getAllByRole("button", { name: "View details" });
    expect(recordActions[0]!).toHaveAttribute("aria-disabled", "true");

    await user.hover(recordActions[0]!);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(/aren't part of this build/i);
  });
});

describe("the usage error state", () => {
  it("shows a retryable error instead of a blank screen", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/credits/usage`, () => {
        calls += 1;
        return calls === 1 ? errors.internal() : HttpResponse.json({ data: fixtures.usagePage });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<UsagePage />);

    expect(await screen.findByText(/Couldn't load your usage/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("24.97M credits")).toBeInTheDocument());
  });
});
