"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";

const MIN_DESCRIPTION_LENGTH = 10;

export async function submitBugReport(description: string) {
  const trimmed = description.trim();
  if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
    throw new Error("description_too_short");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("bug_reports").insert({
    user_id: user.id,
    description: trimmed,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/admin/reportes");
}
