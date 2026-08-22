import { ALLOWED_MODELS, type ModelId } from "@/contracts";

/**
 * Ids whose last path segment does not describe them. `openrouter/free` is the Free Models Router,
 * which picks an available free model per request — so it is a mode rather than a model, and "free"
 * would read as a tier rather than as a choice. The reference calls it `Magica Auto`, and so do we —
 * this clone carries the same brand, so the same name is the exact one.
 */
const NAMED_MODELS: Record<string, { label: string; hint: string }> = {
  "openrouter/free": {
    label: "Magica Auto",
    hint: "Automatically picks an available free model for your task",
  },
  "nvidia/nemotron-3-super-120b-a12b:free": {
    label: "nemotron-3-super-120b-a12b",
    hint: "Largest free model — best for complex tasks",
  },
  "google/gemma-4-31b-it:free": {
    label: "gemma-4-31b-it",
    hint: "Fast reasoning for everyday tasks",
  },
  "z-ai/glm-5.2:free": { label: "glm-5.2", hint: "Balanced model for general work" },
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
