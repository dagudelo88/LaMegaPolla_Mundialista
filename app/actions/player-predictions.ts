"use server";

import type { PronosticosPayload } from "@/app/actions/predictions";
import { fetchPronosticosPayload } from "@/lib/predictions/fetch-pronosticos-payload";
import { getLeaderboardRank, loadLeaderboard } from "@/lib/pool/load-leaderboard";
import { isPublicPredictionsEnabled } from "@/lib/pool/public-predictions-access";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export type PublicPlayerPredictionsPayload = PronosticosPayload & {
  username: string;
  rank: number | null;
};

export async function loadPublicPlayerPredictions(
  username: string
): Promise<PublicPlayerPredictionsPayload> {
  const enabled = await isPublicPredictionsEnabled();
  if (!enabled) notFound();

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .not("invite_redeemed_at", "is", null)
    .maybeSingle();

  if (!profile?.username) notFound();

  const [payload, leaderboard] = await Promise.all([
    fetchPronosticosPayload(supabase, profile.id),
    loadLeaderboard(),
  ]);

  return {
    ...payload,
    username: profile.username,
    rank: getLeaderboardRank(leaderboard, profile.username),
  };
}
