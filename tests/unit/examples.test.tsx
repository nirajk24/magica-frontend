import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { ChatWithMessages } from "@/contracts";
import { ExampleScreen } from "@/components/examples/ExampleScreen";
import { Sidebar } from "@/components/shell/Sidebar";
import { exampleChat } from "@/examples/chats";
import { EXAMPLE_TITLES } from "@/examples/titles";
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
      const messages = exampleChat(id)!.messages;

      expect(messages.filter((m) => m.role === "user").length, id).toBeGreaterThanOrEqual(3);
      expect(messages.some((m) => m.toolInvocations.length > 0), `${id} shows no work`).toBe(true);
    }
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
