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
        className="text-lg font-bold tracking-tight text-foreground mt-5 mb-2.5 pb-1.5 border-b border-border/60 first:mt-0"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        className="text-base font-semibold tracking-tight text-foreground mt-4 mb-2 pb-1 border-b border-border/40 first:mt-0"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-sm font-semibold tracking-tight text-foreground mt-3.5 mb-1.5 first:mt-0" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className="text-xs font-semibold tracking-tight text-foreground mt-3 mb-1 first:mt-0" {...props}>
        {children}
      </h4>
    ),
    p: ({ children, ...props }) => (
      <p className="text-xs leading-relaxed text-foreground/90 my-2" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="my-2 ml-4 list-disc space-y-1 text-xs text-foreground/90" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="my-2 ml-4 list-decimal space-y-1 text-xs text-foreground/90" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-relaxed pl-1" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="my-3 border-l-2 border-primary/70 bg-muted/30 px-3.5 py-2 text-xs italic text-muted-foreground rounded-r"
        {...props}
      >
        {children}
      </blockquote>
    ),
    hr: ({ ...props }) => <hr className="my-4 border-border/60" {...props} />,
    a: ({ href, children, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
        {...props}
      >
        {children}
      </a>
    ),
    table: ({ children, ...props }) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs text-left border-collapse" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-muted/60 text-foreground font-semibold border-b border-border" {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }) => (
      <th className="p-2.5 text-xs font-semibold text-foreground" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="p-2.5 text-xs border-t border-border/40 text-foreground/90" {...props}>
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
          <div className="my-3">
            <ShikiCodeView code={rawCode} lang={lang} title={`Contoh Kode (${lang})`} maxHeight="360px" />
          </div>
        );
      }

      return (
        <code
          className={cn(
            "rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-primary border border-border/50",
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
    <div className={cn("markdown-body text-xs", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
