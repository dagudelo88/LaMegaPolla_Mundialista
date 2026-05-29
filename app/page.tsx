import Link from "next/link";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="flex flex-col items-center gap-8 py-12 text-center">
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-sm uppercase tracking-widest text-[var(--color-accent)]">
          Mundial 2026
        </p>
        <h1 className="text-4xl font-bold md:text-5xl">{es.landing.heroTitle}</h1>
        <p className="text-lg text-[var(--color-muted-foreground)]">
          {es.landing.heroSubtitle}
        </p>
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          {es.landing.authNote}
        </p>
        <p className="text-sm text-[var(--color-accent)]">{es.landing.inviteNote}</p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3">
        {user ? (
          <Button asChild size="lg" className="w-full">
            <Link href="/dashboard">{es.nav.dashboard}</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg" className="w-full">
              <Link href="/join">{es.landing.ctaRegister}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/login">{es.landing.ctaLogin}</Link>
            </Button>
          </>
        )}
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/reglas">{es.landing.ctaRules}</Link>
        </Button>
      </div>
    </section>
  );
}
