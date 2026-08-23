import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddCreditsModal } from "@/components/credits/AddCreditsModal";
import { PlanProgressCard } from "@/components/blocks/PlanProgressCard";
import { SidebarFooter } from "@/components/shell/SidebarFooter";
import { TopBar } from "@/components/shell/TopBar";
import { env } from "@/lib/env";
import { useUI } from "@/stores/ui";
import { server } from "../msw/setup";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

describe("the credits popover", () => {
  it("opens under the chip with the balance and the tier", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopBar />);

    await user.click(await screen.findByRole("button", { name: "Available credits" }));

    expect(await screen.findByText("FREE TIER")).toBeInTheDocument();
    expect(screen.getByText("Available Credits")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Credits/ })).toBeInTheDocument();
  });

  it("keeps the usage entry visible but honest about why it is disabled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopBar />);

    await user.click(await screen.findByRole("button", { name: "Available credits" }));
    await user.hover(await screen.findByRole("button", { name: "View usage" }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/isn't part of this build/i);
  });
});

describe("the add-credits modal", () => {
  it("opens from the sidebar's solid button", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <SidebarFooter />
        <AddCreditsModal />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(await screen.findByRole("button", { name: /Add Credits/ }));

    expect(await screen.findByText(/Top up credits/)).toBeInTheDocument();
  });

  it("tops up a preset amount in microcredits and shows the new balance", async () => {
    const user = userEvent.setup();
    let sent: { amount?: string } | null = null;
    let balance = fixtures.creditsPage.balance;
    server.use(
      http.get(`${API}/credits`, () =>
        HttpResponse.json({ data: { ...fixtures.creditsPage, balance } }),
      ),
      http.post(`${API}/credits/top-up`, async ({ request }) => {
        sent = (await request.json()) as { amount?: string };
        balance = fixtures.toppedUpBalance;
        return HttpResponse.json({ data: { balance } });
      }),
    );

    useUI.setState({ addCreditsOpen: true });
    renderWithProviders(
      <>
        <TopBar />
        <AddCreditsModal />
      </>,
    );
    await screen.findByText("29.99M");

    await user.click(await screen.findByRole("button", { name: /^Add Credits$/ }));

    await waitFor(() => expect(sent).toEqual({ amount: "20000000" }));
    expect(await screen.findByText("49.99M")).toBeInTheDocument();
    await waitFor(() => expect(useUI.getState().addCreditsOpen).toBe(false));
  });

  it("sends a custom amount and refuses a nonsensical one", async () => {
    const user = userEvent.setup();
    let sent: { amount?: string } | null = null;
    let balance = fixtures.creditsPage.balance;
    server.use(
      http.get(`${API}/credits`, () =>
        HttpResponse.json({ data: { ...fixtures.creditsPage, balance } }),
      ),
      http.post(`${API}/credits/top-up`, async ({ request }) => {
        sent = (await request.json()) as { amount?: string };
        balance = fixtures.toppedUpBalance;
        return HttpResponse.json({ data: { balance } });
      }),
    );

    useUI.setState({ addCreditsOpen: true });
    renderWithProviders(<AddCreditsModal />);

    const custom = await screen.findByLabelText("Custom amount");
    await user.type(custom, "5000");

    expect(screen.getByRole("button", { name: /^Add Credits$/ })).toBeDisabled();

    await user.clear(custom);
    await user.type(custom, "35");
    await user.click(screen.getByRole("button", { name: /^Add Credits$/ }));

    await waitFor(() => expect(sent).toEqual({ amount: "35000000" }));
  });
});

describe("the plan progress card", () => {
  it("renders every step state with the server's estimates", () => {
    renderWithProviders(<PlanProgressCard plan={fixtures.activePlan} />);

    expect(screen.getByText("Poster in three steps")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByLabelText("Completed")).toBeInTheDocument();
    expect(screen.getByLabelText("In progress")).toBeInTheDocument();
    expect(screen.getByLabelText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Generated at 1024x1536")).toBeInTheDocument();
    expect(screen.getByText("0.42M")).toBeInTheDocument();
  });
});
