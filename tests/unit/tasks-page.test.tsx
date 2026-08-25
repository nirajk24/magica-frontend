import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TasksPage } from "@/components/tasks/TasksPage";
import { env } from "@/lib/env";
import { server } from "../msw/setup";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

/** Captures the query the page actually asked the server for. */
function recordChatsQuery() {
  const seen = vi.fn();

  server.use(
    http.get(`${API}/chats`, ({ request }) => {
      const url = new URL(request.url);
      seen({ search: url.searchParams.get("search"), filter: url.searchParams.get("filter") });

      return HttpResponse.json({ data: fixtures.chatsPage });
    }),
  );

  return seen;
}

describe("the tasks page", () => {
  /**
   * The clock is pinned near the fixtures. `Intl.RelativeTimeFormat` with `numeric: "auto"` switches
   * phrasing as a date ages — a day-old row reads "yesterday", not "1 day ago" — so a fixture with a
   * fixed timestamp changes what this renders depending on when the suite runs.
   */
  it("lists tasks with the time since they were last touched", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
    renderWithProviders(<TasksPage />);

    expect(await screen.findByRole("link", { name: /Premium Scandinavian Stamp Sheet/ })).toHaveAttribute(
      "href",
      `/chat/${fixtures.CHAT_ID}`,
    );
    // `numeric: "auto"` says "yesterday" and "last month" rather than "1 day ago", so the whole
    // vocabulary has to be matched or this passes only until a fixture crosses a unit boundary.
    expect((await screen.findAllByText(/ago|just now|yesterday|last (month|year)/)).length).toBe(
      fixtures.chatsPage.chats.length,
    );

    vi.useRealTimers();
  });

  it("shows eight skeleton rows rather than a blank page while loading", () => {
    renderWithProviders(<TasksPage />);

    expect(document.querySelectorAll(".animate-pulse").length).toBe(16);
  });

  it("sends the search to the server, because it covers message content too", async () => {
    const user = userEvent.setup();
    const seen = recordChatsQuery();

    renderWithProviders(<TasksPage />);

    await user.type(screen.getByRole("searchbox", { name: "Search tasks" }), "stamp");

    await waitFor(() =>
      expect(seen).toHaveBeenCalledWith(expect.objectContaining({ search: "stamp" })),
    );
  });

  it("does not send a search made only of whitespace", async () => {
    const user = userEvent.setup();
    const seen = recordChatsQuery();

    renderWithProviders(<TasksPage />);
    await screen.findByRole("link", { name: /Premium/ });

    await user.type(screen.getByRole("searchbox", { name: "Search tasks" }), "   ");

    expect(seen).not.toHaveBeenCalledWith(expect.objectContaining({ search: "   " }));
  });

  it("filters server-side when a filter is chosen", async () => {
    const user = userEvent.setup();
    const seen = recordChatsQuery();

    renderWithProviders(<TasksPage />);

    await user.click(screen.getByRole("button", { name: /Filter by/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Pinned" }));

    await waitFor(() =>
      expect(seen).toHaveBeenCalledWith(expect.objectContaining({ filter: "pinned" })),
    );
  });

  it("says so when a search matches nothing, rather than looking broken", async () => {
    server.use(
      http.get(`${API}/chats`, () => HttpResponse.json({ data: { chats: [], nextCursor: null } })),
    );
    const user = userEvent.setup();

    renderWithProviders(<TasksPage />);

    await user.type(screen.getByRole("searchbox", { name: "Search tasks" }), "nothing");

    expect(await screen.findByText("No tasks match that search.")).toBeInTheDocument();
  });

  it("distinguishes an empty account from an empty search", async () => {
    server.use(
      http.get(`${API}/chats`, () => HttpResponse.json({ data: { chats: [], nextCursor: null } })),
    );

    renderWithProviders(<TasksPage />);

    expect(await screen.findByText("No tasks yet")).toBeInTheDocument();
  });

  it("selects rows and deletes them through the real route", async () => {
    const user = userEvent.setup();
    const deleted: string[] = [];
    server.use(
      http.delete(`${API}/chats/:chatId`, ({ params }) => {
        deleted.push(String(params.chatId));
        return HttpResponse.json({ data: { ok: true } });
      }),
    );

    renderWithProviders(<TasksPage />);
    await screen.findByText(fixtures.chat.title);

    await user.click(screen.getByRole("button", { name: "Select tasks" }));
    await user.click(screen.getByRole("checkbox", { name: fixtures.chat.title }));

    expect(screen.getByText("1 Selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete selected tasks" }));

    await waitFor(() => expect(deleted).toEqual([fixtures.chat.id]));
  });

  it("leaves select mode without touching anything on Done", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TasksPage />);
    await screen.findByText(fixtures.chat.title);

    await user.click(screen.getByRole("button", { name: "Select tasks" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.queryByText(/Selected/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(fixtures.chat.title) })).toBeInTheDocument();
  });

  it("renames a task in place through the context menu", async () => {
    const user = userEvent.setup();
    let sent: { title?: string } | null = null;
    server.use(
      http.patch(`${API}/chats/:chatId`, async ({ request }) => {
        sent = (await request.json()) as { title?: string };
        return HttpResponse.json({ data: { chat: { ...fixtures.chat, title: "Poster brief" } } });
      }),
    );

    renderWithProviders(<TasksPage />);
    const row = await screen.findByRole("link", { name: new RegExp(fixtures.chat.title) });

    await user.pointer({ keys: "[MouseRight]", target: row });
    await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
    const input = await screen.findByRole("textbox", { name: "Task name" });
    await user.clear(input);
    await user.type(input, "Poster brief{Enter}");

    await waitFor(() => expect(sent).toEqual({ title: "Poster brief" }));
  });

  it("pins a task through the context menu", async () => {
    const user = userEvent.setup();
    let sent: { isFavorite?: boolean } | null = null;
    server.use(
      http.patch(`${API}/chats/:chatId`, async ({ request }) => {
        sent = (await request.json()) as { isFavorite?: boolean };
        return HttpResponse.json({ data: { chat: { ...fixtures.chat, isFavorite: true } } });
      }),
    );

    renderWithProviders(<TasksPage />);
    const row = await screen.findByRole("link", { name: new RegExp(fixtures.chat.title) });

    await user.pointer({ keys: "[MouseRight]", target: row });
    await user.click(await screen.findByRole("menuitem", { name: /Pin to top/ }));

    await waitFor(() => expect(sent).toEqual({ isFavorite: true }));
  });

  it("starts a new task from the toolbar", () => {
    renderWithProviders(<TasksPage />);

    expect(screen.getByRole("link", { name: /New task/ })).toHaveAttribute("href", "/chat");
  });
});
