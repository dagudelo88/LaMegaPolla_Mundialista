import Link from "next/link";
import { AdminPlayerPredictionsSection } from "@/components/admin/admin-player-predictions-section";
import { AdminPodiumTies } from "@/components/admin/admin-podium-ties";
import { AdminPublicPredictionsToggle } from "@/components/admin/admin-public-predictions-toggle";
import { InviteGenerator } from "@/components/admin/invite-generator";
import { InviteCodesList } from "@/components/admin/invite-codes-list";
import { AdminParticipantsTable } from "@/components/admin/admin-participants-table";
import { loadInviteCodesSummary } from "@/lib/admin/load-invite-codes";
import { loadAdminParticipants } from "@/lib/admin/load-participants";
import { requireAdmin } from "@/lib/auth/require-admin";
import { loadHomeDashboardData } from "@/lib/pool/load-home-data";
import { isPublicPredictionsEnabled } from "@/lib/pool/public-predictions-access";
import { getPodiumTies } from "@/lib/pool/load-leaderboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { es } from "@/lib/i18n/es";

interface PageProps {
  searchParams: Promise<{ jugador?: string }>;
}

export default async function AdminPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { jugador } = await searchParams;
  const admin = createAdminClient();

  const [inviteCodes, participants, homeData, publicPredictionsEnabled] = await Promise.all([
    loadInviteCodesSummary(admin),
    loadAdminParticipants(admin),
    loadHomeDashboardData(),
    isPublicPredictionsEnabled(),
  ]);

  const podiumTies = getPodiumTies(homeData.leaderboard, {
    firstPlace: homeData.pool.firstPlace,
    secondPlace: homeData.pool.secondPlace,
    thirdPlace: homeData.pool.thirdPlace,
  });

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{es.admin.title}</h1>
        <p className="max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          {es.admin.dashboardHint}
        </p>
      </header>

      <AdminPublicPredictionsToggle enabled={publicPredictionsEnabled} />

      <AdminPlayerPredictionsSection selectedPlayerId={jugador} />

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/resultados"
          className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-medium hover:border-[var(--color-accent)]"
        >
          {es.admin.resultsLink} →
        </Link>
        <Link
          href="/admin#corregir-pronosticos"
          className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-medium hover:border-[var(--color-accent)]"
        >
          {es.admin.predictionsLink} →
        </Link>
      </div>

      <AdminPodiumTies ties={podiumTies} currency={homeData.pool.currency} />

      <AdminParticipantsTable participants={participants} />

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="text-lg font-semibold">{es.admin.invites}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.admin.invitesHint}
        </p>
        <div className="mt-3">
          <InviteCodesList
            totalGenerated={inviteCodes.totalGenerated}
            totalUsed={inviteCodes.totalUsed}
            available={inviteCodes.available}
            used={inviteCodes.used}
          />
        </div>
        <InviteGenerator />
      </div>
    </section>
  );
}
