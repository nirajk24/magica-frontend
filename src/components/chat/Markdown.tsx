"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Assistant prose is real markdown in the reference — bold lead-ins, ordered and unordered lists and
 * inline images all appear in the captures — so it is parsed rather than printed.
 */
const components: Components = {
  p: (props) => <p className="my-4 first:mt-0 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  ul: (props) => <ul className="my-4 list-disc space-y-1 pl-6 first:mt-0 last:mb-0" {...props} />,
  ol: (props) => (
    <ol className="my-4 list-decimal space-y-1 pl-6 first:mt-0 last:mb-0" {...props} />
  ),
  li: (props) => <li className="pl-1" {...props} />,
  a: (props) => (
    <a
      className="text-info underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
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
  img: ({ alt, src }) =>
    typeof src === "string" ? (
      <img src={src} alt={alt ?? ""} className="my-4 max-w-full rounded-card" />
    ) : null,
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
