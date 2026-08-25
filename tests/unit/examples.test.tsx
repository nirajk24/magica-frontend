import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatWithMessages } from "@/contracts";
import { ExampleScreen } from "@/components/examples/ExampleScreen";
import { Sidebar } from "@/components/shell/Sidebar";
import { exampleChat } from "@/examples/chats";
import { EXAMPLE_TITLES } from "@/examples/titles";
import { useUI } from "@/stores/ui";
import { clerkMock } from "../clerk-mock";
import { routerMock } from "../router-mock";
import { renderWithProviders } from "../render";

describe("the example fixtures", () => {
  /**
   * They are rendered by the same components a live chat uses, so the guarantee that matters is
   * that they really are the shape the API returns — not merely close enough to render today.
   */
  it("parse as the contract the API returns", () => {
    for (const { id } of EXAMPLE_TITLES) {
      const parsed = ChatWithMessages.safeParse(exampleChat(id));

      expect(parsed.success, `${id}: ${parsed.error?.issues[0]?.message ?? ""}`).toBe(true);
    }
  });

  it("has a conversation behind every title the sidebar offers", () => {
    for (const { id } of EXAMPLE_TITLES) {
      expect(exampleChat(id), id).toBeDefined();
    }
  });

  it("reads as a conversation rather than a single exchange", () => {
    for (const { id } of EXAMPLE_TITLES) {
      const users = exampleChat(id)!.messages.filter((m) => m.role === "user");

      expect(users.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  /** One is a plain conversation on purpose; the set as a whole still has to show the product working. */
  it("shows generated work in more than one of them", () => {
    const withTools = EXAMPLE_TITLES.filter(({ id }) =>
      exampleChat(id)!.messages.some((m) => m.toolInvocations.length > 0),
    );

    expect(withTools.length).toBeGreaterThanOrEqual(2);
  });
});

describe("an example on screen", () => {
  it("shows the transcript with no composer to type into", () => {
    renderWithProviders(<ExampleScreen example={exampleChat("swiss-city-poster")!} />);

    expect(screen.getByText(/An example conversation/)).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Message"),
      "a disabled input still reads as somewhere to type",
    ).not.toBeInTheDocument();
  });
});

describe("the sidebar", () => {
  it("lists examples in their own section, not among the user's chats", async () => {
    renderWithProviders(<Sidebar />);

    const heading = await screen.findByText("Examples");
    const section = heading.parentElement!;

    for (const example of EXAMPLE_TITLES) {
      expect(within(section).getByText(example.title)).toBeInTheDocument();
    }
  });
});

/**
 * They were nested inside `RecentTasks`, which returns early when signed out — so the one visitor
 * who has nothing else to look at was the one who could not see them.
 */
describe("signed out", () => {
  it("still offers the examples", async () => {
    clerkMock.isSignedIn = false;
    renderWithProviders(<Sidebar />);

    expect(await screen.findByText("Examples")).toBeInTheDocument();
    for (const example of EXAMPLE_TITLES) {
      expect(screen.getByText(example.title)).toBeInTheDocument();
    }
  });

  /**
   * `/chat/recent` redirects to `/sign-in` server-side, which replaces the whole shell — sidebar,
   * examples and all — for someone who has not decided to sign in yet.
   */
  it("opens the sign-in modal from Tasks rather than routing away", async () => {
    const user = userEvent.setup();
    clerkMock.isSignedIn = false;
    renderWithProviders(<Sidebar />);

    await user.click(screen.getByRole("button", { name: "Tasks" }));

    expect(clerkMock.openSignIn).toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});

describe("the examples section", () => {
  it("collapses to a single row, and the choice survives a remount", async () => {
    const user = userEvent.setup();
    const first = renderWithProviders(<Sidebar />);

    await user.click(await first.findByRole("button", { name: /Examples/ }));

    expect(first.queryByText(EXAMPLE_TITLES[0]!.title)).not.toBeInTheDocument();
    expect(useUI.getState().examplesOpen, "the store is what remembers it").toBe(false);

    first.unmount();
    const second = renderWithProviders(<Sidebar />);

    expect(second.queryByText(EXAMPLE_TITLES[0]!.title)).not.toBeInTheDocument();
  });
});
