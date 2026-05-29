"use server";

import { requireUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** REGLAS §6 — one match per matchday as "más goleador" */
export async function setMatchdayBonus(
  matchdayKey: string,
  matchId: string,
  predictedTotalGoals?: number
) {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("matchday_bonuses").upsert(
    {
      user_id: user.id,
      matchday_key: matchdayKey,
      match_id: matchId,
      predicted_total_goals: predictedTotalGoals ?? null,
    },
    { onConflict: "user_id,matchday_key" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/pronosticos");
}
