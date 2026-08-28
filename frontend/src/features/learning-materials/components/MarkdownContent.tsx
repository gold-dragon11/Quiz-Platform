import Markdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import '@/features/learning-materials/components/markdown-content.css';

interface MarkdownContentProps {
  /** Markdown body, with LaTeX between `$…$` and `$$…$$`. */
  content: string;
}

/**
 * Renders a learning material body.
 *
 * Loaded as its own chunk (see MaterialBody) because KaTeX and its stylesheet
 * are large and only a reader who opens a material needs them.
 *
 * Raw HTML is **not** enabled: react-markdown escapes it by default, and no
 * `rehype-raw` is in the pipeline, so a body can only ever produce the
 * elements mapped below. The backend additionally rejects HTML tags and
 * `javascript:`-style links at write time
 * (backend/src/learning-materials/learning-material.constants.ts), making this
 * the second of two independent barriers rather than the only one.
 *
 * Element styles are given explicitly instead of through a typography plugin,
 * so the material reads in the same type scale as the rest of the app.
 */
export function MarkdownContent({ content }: MarkdownContentProps): React.JSX.Element {
  return (
    <div className="text-text-secondary text-[15px] leading-relaxed sm:text-base">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-text-primary mt-10 mb-4 text-2xl font-semibold first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-text-primary border-border mt-10 mb-4 border-t pt-8 text-xl font-semibold first:mt-0 first:border-0 first:pt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-text-primary mt-6 mb-3 text-lg font-medium">{children}</h3>
          ),
          p: ({ children }) => <p className="my-4">{children}</p>,
          ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="text-text-primary font-semibold">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-primary text-text-muted my-4 border-l-2 pl-4 italic">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-surface-elevated text-text-primary rounded px-1.5 py-0.5 text-[0.9em]">
              {children}
            </code>
          ),
          hr: () => <hr className="border-border my-8" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover underline underline-offset-2"
            >
              {children}
            </a>
          ),
          // Tables carry dates and formula summaries, which are wide on a
          // phone. The wrapper scrolls the table alone, so the page itself
          // never scrolls sideways.
          table: ({ children }) => (
            <div className="border-border my-6 overflow-x-auto rounded-lg border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-elevated">{children}</thead>,
          th: ({ children }) => (
            <th className="text-text-primary border-border border-b px-4 py-2.5 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-border border-b px-4 py-2.5 last:border-0">{children}</td>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
