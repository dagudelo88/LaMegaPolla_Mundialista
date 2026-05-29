"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { es } from "@/lib/i18n/es";

export type JoinState = {
  error?: string;
  success?: boolean;
};

export async function redeemInvite(
  _prev: JoinState,
  formData: FormData
): Promise<JoinState> {
  const code = String(formData.get("code") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (!code || !username) {
    return { error: es.errors.generic };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_invitation_code", {
    p_code: code,
    p_username: username,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("invalid_code") || msg.includes("expired") || msg.includes("exhausted")) {
      return { error: es.errors.invalidCode };
    }
    if (msg.includes("username_taken")) {
      return { error: es.errors.usernameTaken };
    }
    if (msg.includes("username_too_short")) {
      return { error: es.errors.usernameTooShort };
    }
    return { error: es.errors.generic };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
