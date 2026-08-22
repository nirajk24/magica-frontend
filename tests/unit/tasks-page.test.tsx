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
  it("lists tasks with the time since they were last touched", async () => {
    renderWithProviders(<TasksPage />);

    expect(await screen.findByRole("link", { name: /Premium Scandinavian Stamp Sheet/ })).toHaveAttribute(
      "href",
      `/chat/${fixtures.CHAT_ID}`,
    );
    expect((await screen.findAllByText(/ago|just now/)).length).toBe(fixtures.chatsPage.chats.length);
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

  it("offers select mode disabled with a reason rather than wired to nothing", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TasksPage />);

    const select = screen.getByRole("button", { name: "Select tasks" });

    expect(select).toHaveAttribute("aria-disabled", "true");

    await user.hover(select);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/isn't wired into this build/i);
  });

  it("starts a new task from the toolbar", () => {
    renderWithProviders(<TasksPage />);

    expect(screen.getByRole("link", { name: /New task/ })).toHaveAttribute("href", "/chat");
  });
});
