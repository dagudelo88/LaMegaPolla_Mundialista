import Link from "next/link";
import { HomeLoggedIn } from "@/components/home/home-logged-in";
import { getProfile } from "@/lib/auth/require-admin";
import { loadHomeDashboardData } from "@/lib/pool/load-home-data";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

interface HomePageProps {
  searchParams: Promise<{ withdrawn?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { withdrawn } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await getProfile(user.id);
    if (profile?.withdrawn_at || withdrawn === "1") {
      return (
        <section className="mx-auto flex max-w-xl flex-col gap-6 py-12 text-center">
          <h1 className="text-3xl font-bold">{es.landing.withdrawnTitle}</h1>
          <p className="text-[var(--color-muted-foreground)]">{es.landing.withdrawnHint}</p>
        </section>
      );
    }

    if (profile?.invite_redeemed_at) {
      const homeData = await loadHomeDashboardData();
      return (
        <HomeLoggedIn
          username={profile.username}
          leaderboard={homeData.leaderboard}
          pool={homeData.pool}
          playerLinksEnabled={homeData.playerLinksEnabled}
        />
      );
    }

    return (
      <section className="flex flex-col items-center gap-8 py-12 text-center">
        <div className="mx-auto max-w-xl space-y-4">
          <h1 className="text-3xl font-bold">{es.landing.completeRegistrationTitle}</h1>
          <p className="text-[var(--color-muted-foreground)]">
            {es.landing.completeRegistrationHint}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/join">{es.nav.completeRegistration}</Link>
        </Button>
      </section>
    );
  }

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
        <Button asChild size="lg" className="w-full">
          <Link href="/join">{es.landing.ctaRegister}</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/login">{es.landing.ctaLogin}</Link>
        </Button>
      </div>
    </section>
  );
}
