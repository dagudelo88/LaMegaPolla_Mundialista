import "server-only";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { ACTIVE_PARTICIPANT_OR_FILTER } from "@/lib/participants/is-active-participant";
import { createAdminClient } from "@/lib/supabase/admin";

/** Registered: invite redeemed, nickname set, not withdrawn (includes unpaid). */
export async function fetchRegisteredParticipantCount(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("username", "is", null)
    .not("invite_redeemed_at", "is", null)
    .is("withdrawn_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Active pool: registered, entry fee confirmed (or admin), not withdrawn. */
export async function fetchPaidParticipantCount(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("username", "is", null)
    .not("invite_redeemed_at", "is", null)
    .is("withdrawn_at", null)
    .or(ACTIVE_PARTICIPANT_OR_FILTER);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

const loadCachedParticipantCounts = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const [registered, paid] = await Promise.all([
      fetchRegisteredParticipantCount(supabase),
      fetchPaidParticipantCount(supabase),
    ]);
    return { registered, paid };
  },
  ["participant-counts-v2"],
  { revalidate: 30, tags: [CACHE_TAGS.leaderboard] }
);

export async function loadParticipantCounts(): Promise<{
  registered: number;
  paid: number;
}> {
  return loadCachedParticipantCounts();
}
