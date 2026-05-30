import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { isAdminProfile } from "@/lib/auth/roles";
import type { User } from "@supabase/supabase-js";

export { getProfile } from "@/lib/auth/get-profile";
export type { AppProfile } from "@/lib/auth/get-profile";

export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("not_authenticated");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!isAdminProfile(profile)) throw new Error("not_admin");
  return { user, profile };
}

export function hasRedeemedInvite(
  profile: { invite_redeemed_at: string | null } | null
): boolean {
  return Boolean(profile?.invite_redeemed_at);
}
