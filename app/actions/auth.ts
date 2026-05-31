"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthenticatedLandingPath } from "@/lib/auth/landing-path";
import { mapAuthError } from "@/lib/auth/map-auth-error";
import { validatePasswordPair } from "@/lib/auth/password";
import { buildPasswordResetRedirectUrl } from "@/lib/auth/password-reset-redirect";
import { getRequestOrigin } from "@/lib/auth/request-origin";
import { es } from "@/lib/i18n/es";

export type LoginState = {
  error?: string;
};

export type ForgotPasswordState = {
  error?: string;
  success?: boolean;
};

export type UpdatePasswordState = {
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

  const next = String(formData.get("next") ?? "").trim();
  const defaultPath = await resolveAuthenticatedLandingPath(supabase, user.id);
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : defaultPath;
  redirect(safeNext);
}

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: es.errors.generic };
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const redirectTo = buildPasswordResetRedirectUrl(origin);

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  return { success: true };
}

export async function updatePasswordAfterRecovery(
  _prev: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  const passwordCheck = validatePasswordPair(password, passwordConfirm);
  if (!passwordCheck.ok) {
    return { error: passwordCheck.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: es.errors.notAuthenticated };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  await supabase.auth.signOut();
  redirect("/login?reset=ok");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
