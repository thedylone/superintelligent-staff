import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold mt-3 mb-2 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-sm text-muted-foreground mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-sm text-muted-foreground mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-muted-foreground">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs font-mono mb-2">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground my-2">{children}</blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
