import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { TopBar } from "@/components/shell/TopBar";
import { env } from "@/lib/env";
import { server } from "../msw/setup";
import { noActiveRun, rateLimited } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

describe("the model pill", () => {
  it("names the model this chat is configured to use, not a build-time default", async () => {
    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("gemma-4-31b-it")).toBeInTheDocument();
  });

  it("falls back to the default only where there is no chat to read", () => {
    renderWithProviders(<TopBar />);

    expect(screen.getByText("Auto")).toBeInTheDocument();
  });

  it("names the free-model router as a mode, not as a model called free", () => {
    server.use(
      fixtures.chatHandlerWith([
        { ...fixtures.userMessage },
        { ...fixtures.assistantMessage, aiModel: null },
      ]),
      http.get(`${env.NEXT_PUBLIC_API_URL}/api/v1/chats/:chatId`, () =>
        HttpResponse.json({
          data: {
            ...fixtures.chatWithMessages,
            chat: { ...fixtures.chat, modelId: "openrouter/free" },
            messages: [fixtures.userMessage, { ...fixtures.assistantMessage, aiModel: null }],
          },
        }),
      ),
    );

    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    expect(screen.queryByText("free")).not.toBeInTheDocument();
  });

  it("says the path is healthy without claiming to know what served the turn", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    await user.hover(await screen.findByText("gemma-4-31b-it"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/fixed for the task/i);
  });
});

describe("when the shared free-tier path is rate limited", () => {
  it("marks the pill rather than leaving it looking normal", async () => {
    server.use(rateLimited);
    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    expect(
      await screen.findByRole("button", { name: /gemma-4-31b-it — rate limited/ }),
    ).toBeInTheDocument();
  });

  it("hedges the wait rather than counting down to a guessed time", async () => {
    const user = userEvent.setup();
    server.use(rateLimited);
    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    await user.hover(await screen.findByRole("button", { name: /rate limited/ }));
    const tip = await screen.findByRole("tooltip");

    expect(tip).toHaveTextContent(/try again shortly/i);
    expect(tip).toHaveTextContent(/shared across everyone/i);
    expect(tip).not.toHaveTextContent(/\d+ seconds|\d+s\b/);
  });

  it("warns beside the composer, before a send is spent on a turn that will fail", async () => {
    server.use(rateLimited, noActiveRun);
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText(/rate limited right now/i)).toBeInTheDocument();
  });

  it("says nothing beside the composer while the path is healthy", async () => {
    server.use(noActiveRun);
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await screen.findByRole("button", { name: "Send message" });

    expect(screen.queryByText(/rate limited right now/i)).not.toBeInTheDocument();
  });
});

describe("once a turn has actually run", () => {
  it("names the model that answered, in preference to the chat's configured one", async () => {
    server.use(
      fixtures.chatHandlerWith([
        fixtures.userMessage,
        { ...fixtures.assistantMessage, aiModel: { id: "z-ai/glm-5.2:free", name: "GLM", provider: "z-ai" } },
      ]),
    );

    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("glm-5.2")).toBeInTheDocument();
  });

  it("falls back to the chat's model when no turn has recorded one", async () => {
    server.use(
      fixtures.chatHandlerWith([fixtures.userMessage, { ...fixtures.assistantMessage, aiModel: null }]),
    );

    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("gemma-4-31b-it")).toBeInTheDocument();
  });
});
