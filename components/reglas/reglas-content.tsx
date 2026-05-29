import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const mdComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-10 mb-4 flex scroll-mt-20 items-center gap-3 border-b border-[var(--color-border)] pb-3 text-xl font-bold text-[var(--color-accent)] md:text-2xl">
      <span className="inline-block h-8 w-1 shrink-0 rounded-full bg-[var(--color-primary)]" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-3 text-lg font-semibold text-[var(--color-foreground)]">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-7 text-[var(--color-foreground)]/90">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--color-accent)]">{children}</strong>
  ),
  hr: () => (
    <hr className="my-8 border-0 border-t border-[var(--color-border)]" />
  ),
  ul: ({ children }) => (
    <ul className="mb-5 space-y-2.5 [&>li]:relative [&>li]:pl-6 [&>li]:leading-7 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.65em] [&>li]:before:h-1.5 [&>li]:before:w-1.5 [&>li]:before:rounded-full [&>li]:before:bg-[var(--color-primary)] [&>li]:before:content-['']">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 list-decimal space-y-2.5 pl-6 marker:font-semibold marker:text-[var(--color-primary)] [&>li]:leading-7">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[var(--color-foreground)]/90 [&>ol]:mt-2 [&>ul]:mt-2">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-5 rounded-r-lg border-l-4 border-[var(--color-primary)] bg-[var(--color-card)] px-4 py-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--color-muted)] text-[var(--color-foreground)]">
      {children}
    </thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-[var(--color-border)]">{children}</tbody>,
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-[var(--color-muted)]/40">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 font-semibold whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 align-top text-[var(--color-foreground)]/90">{children}</td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
};

function ReglasIntro({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const badges: string[] = [];
  const paragraphs: string[] = [];
  let i = 1;
  while (i < lines.length && lines[i].trim() !== "---") {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    const plain = line.replace(/\*\*/g, "");
    if (line.startsWith("**") && line.endsWith("**") && plain.length < 60) {
      badges.push(plain);
    } else {
      paragraphs.push(plain);
    }
    i++;
  }

  if (badges.length === 0 && paragraphs.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 md:p-6">
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {badges.map((line) => (
            <span
              key={line}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1"
            >
              {line}
            </span>
          ))}
        </div>
      )}
      {paragraphs.map((p) => (
        <p
          key={p.slice(0, 40)}
          className="mt-3 text-base leading-relaxed text-[var(--color-muted-foreground)]"
        >
          {p}
        </p>
      ))}
    </div>
  );
}

/** Skip title + intro; content starts at section 1 */
function bodyMarkdown(markdown: string): string {
  const firstHr = markdown.indexOf("\n---\n");
  if (firstHr === -1) return markdown;
  return markdown.slice(firstHr + 5).trim();
}

export function reglasTitle(markdown: string): string {
  const line = markdown.split("\n")[0]?.replace(/^#\s*/, "").trim();
  return line || "Reglamento";
}

export function ReglasContent({ markdown }: { markdown: string }) {
  const content = bodyMarkdown(markdown);

  return (
    <div className="reglas-document">
      <ReglasIntro markdown={markdown} />
      <article
        className={cn(
          "rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/50",
          "px-5 py-6 md:px-8 md:py-10"
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
