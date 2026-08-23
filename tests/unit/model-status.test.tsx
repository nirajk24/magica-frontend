import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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

    expect(screen.getByText("OpenRouter Auto")).toBeInTheDocument();
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

  it("offers the choice on a chat that has not run yet, rather than reporting a past turn", async () => {
    const user = userEvent.setup();
    server.use(fixtures.chatHandlerWith([]));
    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    await user.hover(await screen.findByText("gemma-4-31b-it"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/choose the model/i);
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
  const answeredByAnother = () =>
    fixtures.chatHandlerWith([
      fixtures.userMessage,
      {
        ...fixtures.assistantMessage,
        aiModel: { id: "z-ai/glm-5.2:free", name: "GLM", provider: "z-ai" },
      },
    ]);

  it("keeps naming what the next turn will ask for, not what answered the last one", async () => {
    server.use(answeredByAnother());

    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("gemma-4-31b-it")).toBeInTheDocument();
    expect(screen.queryByText("glm-5.2")).not.toBeInTheDocument();
  });

  it("still says which model did the work, where naming it cannot mislabel the control", async () => {
    const user = userEvent.setup();
    server.use(answeredByAnother());
    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    await user.hover(await screen.findByText("gemma-4-31b-it"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/answered by glm-5\.2/i);
  });

  it("falls back to the chat's model when no turn has recorded one", async () => {
    server.use(
      fixtures.chatHandlerWith([fixtures.userMessage, { ...fixtures.assistantMessage, aiModel: null }]),
    );

    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("gemma-4-31b-it")).toBeInTheDocument();
  });
});

describe("choosing a model", () => {
  it("offers every model this build allows, and marks the one in play", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: "gemma-4-31b-it" }));

    expect(await screen.findByRole("menuitemradio", { name: /OpenRouter Auto/ })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: /gemma-4-31b-it/ }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("names the router as a mode rather than as a model called free", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: "gemma-4-31b-it" }));

    expect(screen.queryByRole("menuitemradio", { name: /^free$/ })).not.toBeInTheDocument();
  });

  it("heads the pinned models with a label that is not itself selectable", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: "gemma-4-31b-it" }));

    expect(await screen.findByText("OpenRouter models")).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitemradio", { name: /^OpenRouter models$/ }),
    ).not.toBeInTheDocument();
  });

  it("carries the choice into the next send", async () => {
    const user = userEvent.setup();
    let body: { modelId?: string } | null = null;
    server.use(
      noActiveRun,
      http.post(`${env.NEXT_PUBLIC_API_URL}/api/v1/chats/:chatId/messages`, async ({ request }) => {
        body = (await request.json()) as { modelId?: string };
        return HttpResponse.json({ data: fixtures.sendMessageResult });
      }),
    );

    renderWithProviders(
      <>
        <TopBar chatId={fixtures.CHAT_ID} />
        <ChatScreen chatId={fixtures.CHAT_ID} />
      </>,
    );

    await user.click(await screen.findByRole("button", { name: "gemma-4-31b-it" }));
    await user.click(await screen.findByRole("menuitemradio", { name: /OpenRouter Auto/ }));

    expect(await screen.findByRole("button", { name: "OpenRouter Auto" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Message"), "make a poster{Enter}");

    await waitFor(() => expect(body?.modelId).toBe("openrouter/free"));
  });

  it("points at the model that hit the limit, without labelling the control with it", async () => {
    const user = userEvent.setup();
    server.use(rateLimited);
    renderWithProviders(<TopBar chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: /rate limited/ }));

    const rows = await screen.findAllByRole("menuitemradio");
    const marked = rows.filter((row) => row.textContent?.includes("rate limited"));

    expect(marked).toHaveLength(1);
  });
});
