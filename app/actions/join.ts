"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { validateInviteCode } from "@/lib/auth/validate-invite-code";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapAuthError } from "@/lib/auth/map-auth-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { es } from "@/lib/i18n/es";

export type JoinState = {
  error?: string;
  success?: boolean;
};

const MIN_PASSWORD_LENGTH = 8;
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

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: es.errors.weakPassword };
  }

  if (password !== passwordConfirm) {
    return { error: es.errors.passwordMismatch };
  }

  const inviteCheck = await validateInviteCode(code);
  if (!inviteCheck.ok) {
    return { error: inviteError(inviteCheck.reason) };
  }

  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return { error: mapAuthError(signUpError.message) };
  }

  if (!signUpData.session) {
    return { error: es.errors.emailConfirmationRequired };
  }

  const { error: redeemError } = await supabase.rpc("redeem_invitation_code", {
    p_code: code,
    p_username: username,
  });

  if (redeemError) {
    await supabase.auth.signOut({ scope: "global" });
    return { error: mapRedeemError(redeemError.message) };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard");
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
    redirect("/dashboard");
  }

  const { error } = await supabase.rpc("redeem_invitation_code", {
    p_code: code,
    p_username: username,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("code_exhausted") || msg.includes("exhausted")) {
      const admin = createAdminClient();
      const normalized = code.trim().toUpperCase();
      const { data: row } = await admin
        .from("invitation_codes")
        .select("redeemed_by")
        .eq("code", normalized)
        .maybeSingle();

      if (row?.redeemed_by === user.id) {
        revalidatePath("/", "layout");
        revalidatePath("/dashboard");
        redirect("/dashboard");
      }
    }
    return { error: mapRedeemError(msg) };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
