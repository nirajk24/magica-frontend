"use client";

import { Download } from "lucide-react";
import type { AssetDTO } from "@/contracts";

/**
 * Generated outputs, rendered once after the prose.
 *
 * The reference briefly renders a generated image twice during terminal streaming — once from the
 * markdown link and once here — before settling on one. We render it once (UI-SPEC D-5).
 */
export function AssetStrip({ assets }: { assets: readonly AssetDTO[] }) {
  if (assets.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-3">
      {assets.map((asset) => (
        <Asset key={asset.url} asset={asset} />
      ))}
    </div>
  );
}

function Asset({ asset }: { asset: AssetDTO }) {
  if (asset.type === "video") {
    return (
      <video
        controls
        src={asset.url}
        className="max-w-[425px] rounded-card border border-border bg-surface"
      />
    );
  }

  if (asset.type === "audio") {
    return <audio controls src={asset.url} className="w-full max-w-[425px]" />;
  }

  return (
    <div className="group/asset relative w-fit">
      <img
        src={asset.url}
        alt=""
        className="max-w-[425px] rounded-card bg-surface"
        loading="lazy"
      />
      <a
        href={asset.url}
        download
        aria-label="Download image"
        className="absolute top-2 right-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover/asset:opacity-100 focus-visible:opacity-100"
      >
        <Download className="size-4" aria-hidden />
      </a>
    </div>
  );
}
