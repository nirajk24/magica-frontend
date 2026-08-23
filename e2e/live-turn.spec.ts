import { expect, test } from "@playwright/test";

/**
 * One real turn, against the real stack: send → dispatch → model → streamed answer → persisted row.
 *
 * This is the only automated test in the repo that spends anything. It costs **one** request from
 * OpenRouter's 50-per-day free allowance, plus whatever credits the turn's tools charge, so it is
 * opt-in and it sends exactly once. Everything else about a turn — the timeline, the failure paths,
 * recovery — is already covered against fixtures, which is why one live turn is enough to be worth
 * its price: it proves the wiring the fixtures cannot, and nothing more.
 *
 * INVARIANT: one `send` per run, and no retries (`playwright.config.ts`). A retried assertion is
 * free; a retried *turn* buys a second request to learn what the first already reported.
 *
 * Requires all three processes up: this app, the backend API, and the agent worker. Without the
 * worker the send is accepted and no turn ever runs, which reads here as a timeout rather than a bug.
 */
test.describe("a live turn", () => {
  test.skip(
    process.env.E2E_LIVE_TURN !== "1",
    "Opt-in: spends an OpenRouter request and credits. Run with E2E_LIVE_TURN=1.",
  );

  // A turn crosses a queue, a model and possibly a tool; the default 60s is not a useful bound.
  test.setTimeout(5 * 60_000);

  test("sends a message and renders the answer it gets back", async ({ page }) => {
    await page.goto("/chat");

    await expect(page.getByRole("button", { name: "Available credits" })).toBeVisible();

    // Deliberately trivial: a prompt that needs no tool keeps the spend to the model call alone.
    await page.getByLabel("Message").fill("Reply with exactly the word: acknowledged.");
    await page.getByRole("button", { name: "Send message" }).click();

    // The server creates the chat, so the address bar moving is the first proof the send landed.
    await page.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 60_000 });

    // The composer's send control is replaced by stop while a run holds the chat — the product's own
    // signal that a run is active, and the reason a double-send has no UI path.
    await expect(page.getByRole("button", { name: /Stop run|Stopping/ })).toBeVisible({
      timeout: 60_000,
    });

    // The turn is over when the stop control gives the send arrow back.
    await expect(page.getByRole("button", { name: "Send message" })).toBeVisible({
      timeout: 4 * 60_000,
    });

    // An answer is on screen, and it is the assistant's rather than the echoed prompt.
    const answer = page.getByText(/acknowledged/i).last();
    await expect(answer).toBeVisible();

    // A completed turn collapses its step group and reports what it cost; both are the persisted
    // row's own rendering, so seeing them means the transcript survived the live-to-stored handover.
    await expect(page.getByText(/Completed \d+ steps?/).last()).toBeVisible();

    // The reference lifts a chat to the top of Recent tasks as it is sent to — the invalidation
    // fixed this session, and a browser is the only place it can actually be observed.
    await expect(page.getByText("Recent tasks")).toBeVisible();
  });

  test("rebuilds the conversation from the database after a reload", async ({ page }) => {
    await page.goto("/chat/recent");

    const firstTask = page.getByRole("link").first();
    await firstTask.click();
    await page.waitForURL(/\/chat\/[0-9a-f-]{36}/);

    const transcript = page.getByText(/Completed \d+ steps?/).last();
    await expect(transcript).toBeVisible();

    await page.reload();

    // No send here: this is the same rows read back over REST, which is the recovery guarantee.
    await expect(page.getByText(/Completed \d+ steps?/).last()).toBeVisible();
  });
});
