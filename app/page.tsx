import Link from "next/link";
import { HomeGuestLanding } from "@/components/home/home-guest-landing";
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

  return <HomeGuestLanding />;
}
