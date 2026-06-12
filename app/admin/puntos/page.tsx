import { AdminGlobalScoreAudit } from "@/components/admin/admin-global-score-audit";
import { AdminPointsAuditSection } from "@/components/admin/admin-points-audit-section";
import { loadAdminParticipants } from "@/lib/admin/load-participants";
import {
  loadAdminGlobalScoreAudit,
  loadAdminPlayerPointsAudit,
} from "@/lib/admin/load-player-points-audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { es } from "@/lib/i18n/es";

interface PageProps {
  searchParams: Promise<{ jugador?: string }>;
}

export default async function AdminPointsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { jugador } = await searchParams;
  const admin = createAdminClient();

  const [participants, globalAudit] = await Promise.all([
    loadAdminParticipants(admin),
    loadAdminGlobalScoreAudit(admin),
  ]);

  const playerOptions = participants
    .filter((p) => p.username)
    .map((p) => ({
      id: p.id,
      username: p.username!,
      totalPoints: p.total_points,
      isSubmitted: p.predictions_submitted,
    }));

  const playerAudit =
    jugador ? await loadAdminPlayerPointsAudit(admin, jugador) : null;

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{es.admin.pointsAudit.title}</h1>
        <p className="max-w-3xl text-sm text-[var(--color-muted-foreground)]">
          {es.admin.pointsAudit.subtitle}
        </p>
      </header>

      <AdminGlobalScoreAudit audit={globalAudit} />

      <AdminPointsAuditSection
        participants={playerOptions}
        selectedPlayerId={jugador}
        audit={playerAudit}
      />
    </section>
  );
}
