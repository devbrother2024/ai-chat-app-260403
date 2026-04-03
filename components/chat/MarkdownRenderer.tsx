"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

const components: Components = {
  pre({ children }) {
    return (
      <pre className="my-3 overflow-x-auto rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 text-sm">
        {children}
      </pre>
    );
  },
  code({ className, children, ...props }) {
    const isBlock = className?.startsWith("hljs") || className?.includes("language-");
    if (isBlock) {
      return (
        <code className={`${className ?? ""} text-[13px] leading-relaxed`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-md bg-foreground/[0.07] px-1.5 py-0.5 text-[13px] font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  a({ href, children, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:opacity-80"
        {...props}
      >
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-foreground/15 bg-foreground/[0.04] px-3 py-1.5 text-left font-semibold">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-foreground/15 px-3 py-1.5">{children}</td>
    );
  },
};

interface MarkdownRendererProps {
  content: string;
}

function MarkdownRendererInner({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererInner);
