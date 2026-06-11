import type { SupabaseClient } from "@supabase/supabase-js";
import { getJornadaKey } from "@/lib/jornada/helpers";
import { processJornadaBonus } from "@/lib/scoring/process-jornada-bonus";

/** Re-liquidates bonus for every jornada that has at least one finished match. */
export async function recalculateAllJornadaBonuses(
  admin: SupabaseClient
): Promise<{ jornadasProcessed: number; usersScored: number }> {
  const { data: finishedMatches, error } = await admin
    .from("matches")
    .select("id, kickoff_at, fifa_schedule_date")
    .eq("status", "finished");

  if (error) throw new Error(error.message);

  const triggerByJornada = new Map<string, string>();
  for (const match of finishedMatches ?? []) {
    const key = getJornadaKey(match);
    if (!triggerByJornada.has(key)) {
      triggerByJornada.set(key, match.id);
    }
  }

  let usersScored = 0;
  for (const matchId of triggerByJornada.values()) {
    try {
      const result = await processJornadaBonus(admin, matchId);
      if (result.settled) {
        usersScored += result.usersScored;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("jornada_results")) {
        console.warn(
          "Skipping jornada bonus backfill: run supabase db push to apply jornada migration."
        );
        return { jornadasProcessed: 0, usersScored: 0 };
      }
      throw err;
    }
  }

  return { jornadasProcessed: triggerByJornada.size, usersScored };
}
