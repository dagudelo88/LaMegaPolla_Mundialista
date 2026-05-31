"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { resolveAuthenticatedLandingPath } from "@/lib/auth/landing-path";
import { validateInviteCode } from "@/lib/auth/validate-invite-code";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapAuthError } from "@/lib/auth/map-auth-error";
import { validatePasswordPair } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { es } from "@/lib/i18n/es";
import type { SupabaseClient } from "@supabase/supabase-js";

export type JoinState = {
  error?: string;
  success?: boolean;
};

const MIN_NICKNAME_LENGTH = 3;
const MAX_NICKNAME_LENGTH = 24;
const NICKNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

function getNickname(formData: FormData): string {
  return String(formData.get("nickname") ?? formData.get("username") ?? "").trim();
}

function validateNickname(nickname: string): string | null {
  if (!nickname) {
    return es.errors.nicknameRequired;
  }
  if (nickname.length < MIN_NICKNAME_LENGTH) {
    return es.errors.usernameTooShort;
  }
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return es.errors.usernameInvalid;
  }
  if (!NICKNAME_PATTERN.test(nickname)) {
    return es.errors.usernameInvalid;
  }
  return null;
}

function inviteError(reason: "invalid" | "expired" | "exhausted"): string {
  if (reason === "expired" || reason === "exhausted") {
    return es.errors.invalidCode;
  }
  return es.errors.invalidCode;
}

function mapRedeemError(message: string): string {
  if (message.includes("invalid_code") || message.includes("expired") || message.includes("exhausted")) {
    return es.errors.invalidCode;
  }
  if (message.includes("username_taken")) {
    return es.errors.usernameTaken;
  }
  if (message.includes("username_too_short")) {
    return es.errors.usernameTooShort;
  }
  return es.errors.generic;
}

async function isUsernameAvailable(admin: SupabaseClient, username: string): Promise<boolean> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  return data == null;
}

async function deleteAuthUser(admin: SupabaseClient, userId: string) {
  await admin.auth.admin.deleteUser(userId);
}

export async function registerWithInvite(
  _prev: JoinState,
  formData: FormData
): Promise<JoinState> {
  const code = String(formData.get("code") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const username = getNickname(formData);

  if (!code || !email || !password) {
    return { error: es.errors.generic };
  }

  const nicknameError = validateNickname(username);
  if (nicknameError) {
    return { error: nicknameError };
  }

  const passwordCheck = validatePasswordPair(password, passwordConfirm);
  if (!passwordCheck.ok) {
    return { error: passwordCheck.error };
  }

  const inviteCheck = await validateInviteCode(code);
  if (!inviteCheck.ok) {
    return { error: inviteError(inviteCheck.reason) };
  }

  const admin = createAdminClient();

  if (!(await isUsernameAvailable(admin, username))) {
    return { error: es.errors.usernameTaken };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: mapAuthError(createError?.message ?? "create_user_failed") };
  }

  const userId = created.user.id;
  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    await deleteAuthUser(admin, userId);
    return { error: mapAuthError(signInError.message) };
  }

  const { error: redeemError } = await supabase.rpc("redeem_invitation_code", {
    p_code: code,
    p_username: username,
  });

  if (redeemError) {
    await supabase.auth.signOut({ scope: "global" });
    await deleteAuthUser(admin, userId);
    return { error: mapRedeemError(redeemError.message) };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/pronosticos");
  redirect(await resolveAuthenticatedLandingPath(supabase, userId));
}

export async function redeemInvite(
  _prev: JoinState,
  formData: FormData
): Promise<JoinState> {
  const code = String(formData.get("code") ?? "").trim();
  const username = getNickname(formData);

  if (!code) {
    return { error: es.errors.generic };
  }

  const nicknameError = validateNickname(username);
  if (nicknameError) {
    return { error: nicknameError };
  }

  const inviteCheck = await validateInviteCode(code);
  if (!inviteCheck.ok) {
    return { error: inviteError(inviteCheck.reason) };
  }

  const admin = createAdminClient();
  if (!(await isUsernameAvailable(admin, username))) {
    return { error: es.errors.usernameTaken };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: es.errors.notAuthenticated };
  }

  const existingProfile = await getProfile(user.id);

  if (existingProfile?.invite_redeemed_at) {
    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/pronosticos");
    redirect(await resolveAuthenticatedLandingPath(supabase, user.id));
  }

  const { error } = await supabase.rpc("redeem_invitation_code", {
    p_code: code,
    p_username: username,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("code_exhausted") || msg.includes("exhausted")) {
      const normalized = code.trim().toUpperCase();
      const { data: row } = await admin
        .from("invitation_codes")
        .select("redeemed_by")
        .eq("code", normalized)
        .maybeSingle();

      if (row?.redeemed_by === user.id) {
        revalidatePath("/", "layout");
        revalidatePath("/dashboard");
        revalidatePath("/pronosticos");
        redirect(await resolveAuthenticatedLandingPath(supabase, user.id));
      }
    }
    return { error: mapRedeemError(msg) };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/pronosticos");
  redirect(await resolveAuthenticatedLandingPath(supabase, user.id));
}
