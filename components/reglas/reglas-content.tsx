import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ReglasContent({ markdown }: { markdown: string }) {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-[var(--color-accent)] prose-a:text-[var(--color-primary)] prose-table:border prose-th:border prose-td:border prose-th:p-2 prose-td:p-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </article>
  );
}
