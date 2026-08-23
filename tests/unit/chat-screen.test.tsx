import { beforeEach, describe, expect, it } from "vitest";
import { delay, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { env } from "@/lib/env";
import { server } from "../msw/setup";
import { errors, noActiveRun } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const CHATS = `${env.NEXT_PUBLIC_API_URL}/api/v1/chats`;

describe("ChatScreen", () => {
  beforeEach(() => server.use(noActiveRun));

  it("renders the persisted conversation from REST", async () => {
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText(fixtures.userMessage.content)).toBeInTheDocument();
    expect(screen.getByText("Here is your mountain at sunrise.")).toBeInTheDocument();
  });

  it("shows a spinner while the first page is in flight", () => {
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("explains a chat that is not yours without leaking that it exists", async () => {
    renderWithProviders(<ChatScreen chatId="01999f00-0000-7000-8000-00000000dead" />);

    expect(await screen.findByText(/isn't yours/i)).toBeInTheDocument();
  });

  it("surfaces the traceId on an unexpected failure, so a bug report is actionable", async () => {
    server.use(http.get(`${CHATS}/:chatId`, () => errors.internal()));

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("req_fixture")).toBeInTheDocument();
  });

  it("never requests a chat that does not exist yet", async () => {
    renderWithProviders(<ChatScreen chatId="new" />);

    await waitFor(() => {
      expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/couldn't be loaded/i)).not.toBeInTheDocument();
  });

  it("greets a new chat with the empty-state copy and no transcript", () => {
    renderWithProviders(<ChatScreen chatId="new" />);

    expect(screen.getByPlaceholderText("Assign a task or ask anything...")).toBeInTheDocument();
    expect(screen.queryByTestId("virtuoso")).not.toBeInTheDocument();
  });

  it("uses the in-conversation placeholder for an existing chat", async () => {
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByPlaceholderText("Send a message...")).toBeInTheDocument();
  });

  it("renders the transcript through the virtualized list", async () => {
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByTestId("virtuoso")).toBeInTheDocument();
  });

  /**
   * `active-run` mints a realtime token, so it answers far slower than the transcript beside it.
   * Rendering nothing in that window blanks a turn that is genuinely in flight.
   */
  it("shows the turn while active-run is still answering", async () => {
    server.use(
      fixtures.chatHandlerWith([fixtures.userMessage]),
      http.get(`${CHATS}/:chatId/active-run`, async () => {
        await delay("infinite");
      }),
    );

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText(fixtures.userMessage.content)).toBeInTheDocument();
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("shows nothing extra when the transcript is not owed a turn", async () => {
    server.use(
      http.get(`${CHATS}/:chatId/active-run`, async () => {
        await delay("infinite");
      }),
    );

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("Here is your mountain at sunrise.")).toBeInTheDocument();
    expect(screen.queryByText("Thinking")).not.toBeInTheDocument();
  });
});
