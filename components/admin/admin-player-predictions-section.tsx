import {
  loadAdminPredictionsPageData,
  loadAdminUserPredictions,
} from "@/app/actions/admin-predictions";
import { AdminPlayerPicker } from "@/components/admin/admin-player-picker";
import { AdminUserPredictionsPanel } from "@/components/admin/admin-user-predictions-panel";
import { es } from "@/lib/i18n/es";
import type { MatchPhase, MatchWithTeams } from "@/types/database";

interface AdminPlayerPredictionsSectionProps {
  selectedPlayerId?: string;
  basePath?: string;
}

export async function AdminPlayerPredictionsSection({
  selectedPlayerId,
  basePath = "/admin",
}: AdminPlayerPredictionsSectionProps) {
  const { participants } = await loadAdminPredictionsPageData();

  let userData: Awaited<ReturnType<typeof loadAdminUserPredictions>> | null = null;
  if (selectedPlayerId) {
    try {
      userData = await loadAdminUserPredictions(selectedPlayerId);
    } catch {
      userData = null;
    }
  }

  const matches: MatchWithTeams[] | null = userData
    ? userData.matches.map((m) => ({
        ...m,
        phase: m.phase as MatchPhase,
      }))
    : null;

  return (
    <section
      id="corregir-pronosticos"
      className="scroll-mt-6 space-y-6 rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-card)] p-6"
    >
      <header>
        <h2 className="text-2xl font-bold">{es.admin.predictionsTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          {es.admin.predictionsSubtitle}
        </p>
      </header>

      {!participants.length ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{es.admin.noParticipants}</p>
      ) : (
        <AdminPlayerPicker
          participants={participants}
          selectedId={selectedPlayerId ?? ""}
          basePath={basePath}
        />
      )}

      {selectedPlayerId && !userData && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {es.admin.playerNotFound}
        </p>
      )}

      {userData && matches && selectedPlayerId && (
        <AdminUserPredictionsPanel
          userId={selectedPlayerId}
          username={userData.profile.username}
          matches={matches}
          predictions={userData.predictions}
          overrideHistory={userData.overrideHistory}
        />
      )}
    </section>
  );
}
