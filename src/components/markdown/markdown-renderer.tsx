import { cn } from "cn";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { ShikiCodeView } from "@/components/code/shiki-code-view";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const components: Components = {
    h1: ({ children, ...props }) => (
      <h1
        className="mt-3 mb-1.5 border-border/60 border-b pb-1 font-bold text-base text-foreground leading-snug tracking-tight first:mt-0"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        className="mt-2.5 mb-1 border-border/40 border-b pb-0.5 font-semibold text-foreground text-sm leading-snug tracking-tight first:mt-0"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3
        className="mt-2 mb-0.5 font-semibold text-foreground text-xs leading-snug tracking-tight first:mt-0"
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4
        className="mt-1.5 mb-0.5 font-semibold text-[11px] text-foreground leading-snug tracking-tight first:mt-0"
        {...props}
      >
        {children}
      </h4>
    ),
    p: ({ children, ...props }) => (
      <p className="my-1 text-foreground/90 text-xs leading-normal first:mt-0 last:mb-0" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="my-1 ml-4 list-disc space-y-0.5 text-foreground/90 text-xs" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="my-1 ml-4 list-decimal space-y-0.5 text-foreground/90 text-xs" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="pl-0.5 leading-normal" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="my-1.5 rounded-r border-primary/70 border-l-2 bg-muted/30 px-3 py-1 text-muted-foreground text-xs italic leading-normal"
        {...props}
      >
        {children}
      </blockquote>
    ),
    hr: ({ ...props }) => <hr className="my-2 border-border/60" {...props} />,
    a: ({ href, children, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-2 transition-opacity hover:opacity-80"
        {...props}
      >
        {children}
      </a>
    ),
    table: ({ children, ...props }) => (
      <div className="my-1.5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-xs" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="border-border border-b bg-muted/60 font-semibold text-foreground" {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }) => (
      <th className="p-1.5 font-semibold text-foreground text-xs" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="border-border/40 border-t p-1.5 text-foreground/90 text-xs leading-normal" {...props}>
        {children}
      </td>
    ),
    code: ({ className: codeClassName, children, ...props }) => {
      const match = /language-(\w+)/.exec(codeClassName ?? "");
      const isCodeBlock = match || String(children).includes("\n");

      if (isCodeBlock) {
        const lang = match ? match[1] : "typescript";
        const rawCode = String(children).replace(/\n$/, "");
        return (
          <div className="my-1.5">
            <ShikiCodeView code={rawCode} lang={lang} title={`Contoh Kode (${lang})`} maxHeight="360px" />
          </div>
        );
      }

      return (
        <code
          className={cn(
            "rounded border border-border/50 bg-muted px-1.5 py-0.5 font-medium font-mono text-[11px] text-primary",
            codeClassName,
          )}
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div className={cn("markdown-body text-xs leading-normal", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
