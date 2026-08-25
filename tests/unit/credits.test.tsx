import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddCreditsModal } from "@/components/credits/AddCreditsModal";
import { PlanProgressCard } from "@/components/blocks/PlanProgressCard";
import { SidebarFooter } from "@/components/shell/SidebarFooter";
import { TopBar } from "@/components/shell/TopBar";
import { useUI } from "@/stores/ui";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";


describe("the credits popover", () => {
  it("opens under the chip with the balance and the tier", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopBar />);

    await user.click(await screen.findByRole("button", { name: "Available credits" }));

    expect(await screen.findByText("FREE TIER")).toBeInTheDocument();
    expect(screen.getByText("Available Credits")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Credits/ })).toBeInTheDocument();
  });

  it("links View usage to the usage dashboard", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopBar />);

    await user.click(await screen.findByRole("button", { name: "Available credits" }));

    expect(await screen.findByRole("link", { name: "View usage" })).toHaveAttribute(
      "href",
      "/usage",
    );
  });
});

describe("the credits modal", () => {
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

    expect(await screen.findByText(/fixed allowance/)).toBeInTheDocument();
  });

  /**
   * The endpoint behind this modal was authenticated and took any positive integer, while the
   * modal itself offered 20 to 1000 credits against a real balance of 27. It grants nothing now,
   * and this is what stops a purchase flow growing back without a payment provider behind it.
   */
  it("grants nothing, and says why", async () => {
    useUI.setState({ addCreditsOpen: true });
    renderWithProviders(<AddCreditsModal />);

    expect(await screen.findByText(/no payment provider/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Add Credits$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
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
