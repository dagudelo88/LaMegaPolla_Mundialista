import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/join/register-form";
import { RedeemForm } from "@/components/join/redeem-form";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedLandingPath } from "@/lib/auth/landing-path";
import { getProfile } from "@/lib/auth/get-profile";
import { es } from "@/lib/i18n/es";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let needsRedeemOnly = false;
  let userEmail: string | null = null;

  if (user) {
    userEmail = user.email ?? null;
    const profile = await getProfile(user.id);

    if (profile?.invite_redeemed_at) {
      const { data: submission } = await supabase
        .from("user_tournament_submissions")
        .select("is_complete")
        .eq("user_id", user.id)
        .maybeSingle();

      redirect(
        getAuthenticatedLandingPath({
          invite_redeemed_at: profile.invite_redeemed_at,
          predictions_submitted: submission?.is_complete ?? false,
        })
      );
    }
    needsRedeemOnly = true;
  }

  return (
    <section className="space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">
          {needsRedeemOnly ? es.join.redeemTitle : es.join.title}
        </h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {needsRedeemOnly ? es.join.redeemSubtitle : es.join.subtitle}
        </p>
        {needsRedeemOnly && userEmail && (
          <p className="mx-auto mt-4 max-w-md rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {es.join.redeemLoggedInAs}{" "}
            <strong className="text-white">{userEmail}</strong>
            <br />
            {es.join.redeemLoggedInNote}
          </p>
        )}
      </div>
      {needsRedeemOnly ? <RedeemForm /> : <RegisterForm />}
    </section>
  );
}
