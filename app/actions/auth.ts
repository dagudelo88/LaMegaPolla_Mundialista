"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedLandingPath } from "@/lib/auth/landing-path";
import { mapAuthError } from "@/lib/auth/map-auth-error";
import { es } from "@/lib/i18n/es";

export type LoginState = {
  error?: string;
};

export async function signInWithPassword(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: es.errors.generic };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: es.errors.generic };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("invite_redeemed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.invite_redeemed_at) {
    redirect("/join");
  }

  const { data: submission } = await supabase
    .from("user_tournament_submissions")
    .select("is_complete")
    .eq("user_id", user.id)
    .maybeSingle();

  const next = String(formData.get("next") ?? "").trim();
  const defaultPath = getAuthenticatedLandingPath({
    invite_redeemed_at: profile.invite_redeemed_at,
    predictions_submitted: submission?.is_complete ?? false,
  });
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : defaultPath;
  redirect(safeNext);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
