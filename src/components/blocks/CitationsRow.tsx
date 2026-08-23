import type { BlockProps } from "@/components/blocks/types";

/** Sources. No capture shows this row either; the brief requires `citations` to render in order. */
export function CitationsRow({ block }: BlockProps) {
  if (block.type !== "citations" || block.items.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1 text-[13px]">
      {block.items.map((item) => (
        <li key={item.url}>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="text-info underline underline-offset-2"
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
