import { NextResponse } from "next/server";
import { PASSWORD_UPDATE_PATH } from "@/lib/auth/password-reset-redirect";
import { isSafeRelativePath } from "@/lib/auth/request-origin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/join";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (isSafeRelativePath(nextParam) && nextParam === PASSWORD_UPDATE_PATH) {
        return NextResponse.redirect(`${origin}${PASSWORD_UPDATE_PATH}`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let dest = isSafeRelativePath(nextParam) ? nextParam : "/join";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("invite_redeemed_at")
          .eq("id", user.id)
          .maybeSingle();
        dest = profile?.invite_redeemed_at ? "/dashboard" : "/join";
      }
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
