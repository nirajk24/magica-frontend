import { ALLOWED_MODELS, type ModelId } from "@/contracts";

/**
 * The router entry, which is a mode rather than a model: it resolves to a different model per
 * request. Callers group the menu around it rather than assuming it is first in `ALLOWED_MODELS`.
 */
export const ROUTER_MODEL_ID = "openrouter/free";

/**
 * Ids whose last path segment does not describe them.
 *
 * `openrouter/free` is **OpenRouter's** Free Models Router — it, not this product, picks the model
 * per request. So it is named for what does the routing: calling it `Magica Auto` would claim a
 * routing layer this build does not have.
 *
 * Hints state only what the id itself asserts — provider, and parameter count where the id carries
 * one. This build has no benchmark of its own, so a hint ranking the models by capability would be
 * invented. Rate-limit state is deliberately absent too: it is live, and the picker already shows it
 * per row from `LlmStatus.limitedModel`.
 */
const NAMED_MODELS: Record<string, { label: string; hint: string }> = {
  [ROUTER_MODEL_ID]: {
    label: "OpenRouter Auto",
    hint: "Picks an available free model for each request",
  },
  "nvidia/nemotron-3-super-120b-a12b:free": {
    label: "nemotron-3-super-120b-a12b",
    hint: "Nvidia · 120B parameters",
  },
  "google/gemma-4-31b-it:free": {
    label: "gemma-4-31b-it",
    hint: "Google · 31B parameters",
  },
  "z-ai/glm-5.2:free": { label: "glm-5.2", hint: "Z.ai" },
};

/** The family name, since `nvidia/nemotron-3-super-120b-a12b:free` is not one. */
export function modelLabel(modelId: string): string {
  return (
    NAMED_MODELS[modelId]?.label ?? modelId.replace(/:free$/, "").split("/").pop() ?? modelId
  );
}

/**
 * The one line under a label in the picker. Every allowed model carries a written hint; a model this
 * build has never heard of falls back to its provider, which is at least true.
 */
export function modelHint(modelId: string): string {
  return NAMED_MODELS[modelId]?.hint ?? modelId.split("/")[0] ?? "";
}

/**
 * What the next send will ask for, in precedence order: a choice made on this screen, then what the
 * chat is already configured with, then the build default for a chat that does not exist yet.
 *
 * The result is always an id the picker can show as chosen. A configured model this build does not
 * offer resolves to the default rather than to itself, because the send would be rejected and the
 * trigger would name a row the menu does not contain.
 *
 * INVARIANT: `MessageDTO.aiModel` is not consulted here. It names what *answered* a past turn, which
 * under the router is a resolved sub-model that was never selectable — labelling the control with it
 * would put a name in the trigger that no row in the menu can match.
 */
export function selectedModel(
  pending: ModelId | undefined,
  configured: string | undefined,
): ModelId {
  if (pending) return pending;

  return ALLOWED_MODELS.find((id) => id === configured) ?? ALLOWED_MODELS[0];
}
