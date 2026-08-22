"use client";

import { useMemo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { stripSuppressedUrls } from "@/lib/prose";

/**
 * Assistant prose is real markdown in the reference — bold lead-ins, ordered and unordered lists and
 * inline images all appear in the captures — so it is parsed rather than printed.
 */
const baseComponents: Components = {
  p: (props) => <p className="my-4 first:mt-0 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  ul: (props) => <ul className="my-4 list-disc space-y-1 pl-6 first:mt-0 last:mb-0" {...props} />,
  ol: (props) => (
    <ol className="my-4 list-decimal space-y-1 pl-6 first:mt-0 last:mb-0" {...props} />
  ),
  li: (props) => <li className="pl-1" {...props} />,

  h1: (props) => <h1 className="mt-6 mb-3 text-lg font-semibold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-6 mb-3 text-base font-semibold first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-5 mb-2 text-base font-semibold first:mt-0" {...props} />,
  code: (props) => (
    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em]" {...props} />
  ),
  pre: (props) => (
    <pre
      className="my-4 overflow-x-auto rounded-card border border-border bg-surface p-4 text-sm"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote className="my-4 border-l-2 border-border pl-4 text-fg-muted" {...props} />
  ),
  hr: () => <hr className="my-6 border-border" />,
};

function textOf(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(textOf).join("");

  return "";
}

/**
 * Markdown for one prose block.
 *
 * `suppressUrls` names media the turn already renders — a generated image below the text, a tool
 * card's output. A free model writes those URLs into its prose however firmly the prompt forbids it,
 * so the guard has to be here rather than in the prompt. A bare autolink to one of them is dropped
 * outright; a link with real text keeps the text and loses the anchor.
 */
export function Markdown({
  children,
  suppressUrls,
}: {
  children: string;
  suppressUrls?: ReadonlySet<string>;
}) {
  const source = useMemo(
    () => (suppressUrls ? stripSuppressedUrls(children, suppressUrls) : children),
    [children, suppressUrls],
  );

  const components = useMemo<Components>(
    () => ({
      ...baseComponents,

      a: ({ href, children: linkChildren, ...props }) => {
        if (href && suppressUrls?.has(href)) {
          const text = textOf(linkChildren);

          return text === href || text.length === 0 ? null : <>{linkChildren}</>;
        }

        return (
          <a
            href={href}
            className="text-info underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
            {...props}
          >
            {linkChildren}
          </a>
        );
      },

      img: ({ alt, src }) =>
        typeof src === "string" && !suppressUrls?.has(src) ? (
          <img src={src} alt={alt ?? ""} className="my-4 max-w-full rounded-card" />
        ) : null,
    }),
    [suppressUrls],
  );

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  );
}


