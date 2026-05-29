"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";

export async function submitBugReport(description: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("bug_reports").insert({
    user_id: user.id,
    description: description.trim(),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
