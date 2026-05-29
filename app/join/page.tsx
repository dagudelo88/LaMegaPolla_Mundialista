import { JoinForm } from "@/components/join/join-form";
import { es } from "@/lib/i18n/es";

export default function JoinPage() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{es.join.title}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">{es.join.subtitle}</p>
      </div>
      <JoinForm />
    </section>
  );
}
