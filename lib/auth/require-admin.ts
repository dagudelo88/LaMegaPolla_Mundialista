import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, username, total_points, invite_redeemed_at")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("not_authenticated");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (profile?.role !== "admin") throw new Error("not_admin");
  return { user, profile };
}

export function hasRedeemedInvite(
  profile: { invite_redeemed_at: string | null } | null
): boolean {
  return Boolean(profile?.invite_redeemed_at);
}
