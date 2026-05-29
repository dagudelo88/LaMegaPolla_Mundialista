"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "MEGA-";
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export async function generateInviteCode() {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const code = randomCode();
  const { error } = await admin.from("invitation_codes").insert({
    code,
    created_by: user.id,
    max_uses: 1,
    uses_count: 0,
  });

  if (error) throw new Error(error.message);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "generate_invite_code",
    target_type: "invitation_codes",
    target_id: code,
    details: { code },
  });

  revalidatePath("/admin");
  return { code };
}

export async function setMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number
) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: "finished",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) throw new Error(error.message);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "set_match_result",
    target_type: "matches",
    target_id: matchId,
    details: { homeScore, awayScore },
  });

  revalidatePath("/admin");
}
