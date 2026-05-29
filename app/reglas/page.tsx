import { ReglasContent } from "@/components/reglas/reglas-content";
import { loadReglasMarkdown } from "@/lib/reglas/load-reglas";

export default async function ReglasPage() {
  const markdown = await loadReglasMarkdown();

  return (
    <section>
      <ReglasContent markdown={markdown} />
    </section>
  );
}
