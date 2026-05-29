"use server";

import { requireUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { getPaidChangeCost } from "@/lib/changes/paid-change-cost";
import { getConfigNumber } from "@/lib/config/get-config";
import { revalidatePath } from "next/cache";

/** REGLAS §5 — paid prediction change (max 1 per day) */
export async function applyPaidPredictionChange(
  predictionId: string,
  newHome: number,
  newAway: number,
  phase: import("@/lib/scoring/calculate-match-points").MatchPhase
) {
  const user = await requireUser();
  const supabase = await createClient();

  const maxPerDay = await getConfigNumber("changes.max_per_day", 1);
  const today = new Date().toISOString().slice(0, 10);

  const { count } = await supabase
    .from("prediction_changes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("change_date", today);

  if ((count ?? 0) >= maxPerDay) {
    throw new Error("daily_limit_reached");
  }

  const { data: prediction } = await supabase
    .from("predictions")
    .select("predicted_home, predicted_away, match_id")
    .eq("id", predictionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prediction) throw new Error("prediction_not_found");

  const { data: match } = await supabase
    .from("matches")
    .select("prediction_deadline, status, phase")
    .eq("id", prediction.match_id)
    .maybeSingle();

  if (!match) throw new Error("match_not_found");

  if (match.status !== "scheduled" || new Date() > new Date(match.prediction_deadline)) {
    throw new Error("match_locked");
  }

  const cost = await getPaidChangeCost(
    (match.phase ?? phase) as import("@/lib/scoring/calculate-match-points").MatchPhase
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_points")
    .eq("id", user.id)
    .single();

  if ((profile?.total_points ?? 0) < cost) {
    throw new Error("insufficient_points");
  }

  const { error: changeErr } = await supabase.from("prediction_changes").insert({
    user_id: user.id,
    prediction_id: predictionId,
    old_home: prediction.predicted_home,
    old_away: prediction.predicted_away,
    new_home: newHome,
    new_away: newAway,
    points_spent: cost,
    change_date: today,
  });

  if (changeErr) throw new Error(changeErr.message);

  const { error: predErr } = await supabase
    .from("predictions")
    .update({
      predicted_home: newHome,
      predicted_away: newAway,
      updated_at: new Date().toISOString(),
    })
    .eq("id", predictionId);

  if (predErr) throw new Error(predErr.message);

  const { error: ptsErr } = await supabase
    .from("profiles")
    .update({ total_points: (profile?.total_points ?? 0) - cost })
    .eq("id", user.id);

  if (ptsErr) throw new Error(ptsErr.message);

  revalidatePath("/dashboard");
  revalidatePath("/pronosticos");
}
