import type { ToolView } from "@/lib/timeline";

const MAX_DEPTH = 4;

function collectUrls(value: unknown, depth: number, into: string[]): void {
  if (depth > MAX_DEPTH || into.length >= 8) return;

  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, depth + 1, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectUrls(item, depth + 1, into);
  }
}

/**
 * The result URLs a tool card can render.
 *
 * A live invocation reports them directly; a persisted one carries a provider-shaped `output`, so
 * they are collected from it. Bounded in depth and count because the shape is only known to the tool.
 */
export function outputUrls(tool: ToolView): string[] {
  if (tool.resultUrls.length > 0) return tool.resultUrls;

  const urls: string[] = [];
  collectUrls(tool.output, 0, urls);

  return urls;
}

const FIELD_LABELS: Record<string, string> = {
  prompt: "Prompt",
  model: "Model",
  tool: "Tool",
  size: "Size",
  quality: "Quality",
  aspect_ratio: "Aspect Ratio",
  resolution: "Resolution",
  image_url: "Image",
  video_urls: "Videos",
  transition: "Transition",
  crop: "Crop",
  model_id: "Model ID",
  skill_name: "Skill",
};

/** The reference labels its detail rows in title case, so snake_case keys are humanised. */
export function fieldLabel(key: string): string {
  return (
    FIELD_LABELS[key] ??
    key
      .split(/[_\s]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function fieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  return JSON.stringify(value);
}

/** Sanitized input as ordered label/value pairs. A non-object input has no rows to show. */
export function inputRows(input: unknown): [string, string][] {
  if (!input || typeof input !== "object" || Array.isArray(input)) return [];

  return Object.entries(input as Record<string, unknown>).map(([key, value]) => [
    fieldLabel(key),
    fieldValue(value),
  ]);
}
