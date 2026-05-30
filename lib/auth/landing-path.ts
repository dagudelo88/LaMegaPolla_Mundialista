import type { SupabaseClient } from "@supabase/supabase-js";

/** Default route after login, join, or visiting home before submitting predictions. */
export function getAuthenticatedLandingPath(profile: {
  invite_redeemed_at?: string | null;
  predictions_submitted?: boolean;
}): string {
  if (!profile.invite_redeemed_at) return "/join";
  return profile.predictions_submitted ? "/" : "/pronosticos";
}

export async function resolveAuthenticatedLandingPath(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const [{ data: profile }, { data: submission }] = await Promise.all([
    supabase.from("profiles").select("invite_redeemed_at").eq("id", userId).maybeSingle(),
    supabase
      .from("user_tournament_submissions")
      .select("is_complete")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return getAuthenticatedLandingPath({
    invite_redeemed_at: profile?.invite_redeemed_at,
    predictions_submitted: submission?.is_complete ?? false,
  });
}
