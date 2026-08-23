import { describe, expect, it } from "vitest";
import { ALLOWED_MODELS } from "@/contracts";
import { modelHint, modelLabel, selectedModel } from "@/lib/models";

describe("modelLabel", () => {
  it("names the router for who does the routing, not for this product", () => {
    expect(modelLabel("openrouter/free")).toBe("OpenRouter Auto");
  });

  it("keeps the family name for a real model", () => {
    expect(modelLabel("nvidia/nemotron-3-super-120b-a12b:free")).toBe(
      "nemotron-3-super-120b-a12b",
    );
  });
});

describe("modelHint", () => {
  it("falls back to the provider rather than inventing a description", () => {
    expect(modelHint("z-ai/some-future-model")).toBe("z-ai");
  });
});

describe("selectedModel", () => {
  it("prefers a choice not yet carried by a send", () => {
    expect(selectedModel("z-ai/glm-5.2:free", "openrouter/free")).toBe("z-ai/glm-5.2:free");
  });

  it("uses what the chat is configured with when nothing has been chosen", () => {
    expect(selectedModel(undefined, "google/gemma-4-31b-it:free")).toBe(
      "google/gemma-4-31b-it:free",
    );
  });

  it("resolves a model this build no longer offers, rather than naming an unselectable row", () => {
    expect(selectedModel(undefined, "openai/gpt-9")).toBe(ALLOWED_MODELS[0]);
  });

  it("falls back to the default for a chat the server has not created yet", () => {
    expect(selectedModel(undefined, undefined)).toBe(ALLOWED_MODELS[0]);
  });
});
