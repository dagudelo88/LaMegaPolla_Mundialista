import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/join/register-form";
import { RedeemForm } from "@/components/join/redeem-form";
import { createClient } from "@/lib/supabase/server";
import { es } from "@/lib/i18n/es";

export default async function JoinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let needsRedeemOnly = false;
  let userEmail: string | null = null;

  if (user) {
    userEmail = user.email ?? null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("invite_redeemed_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.invite_redeemed_at) {
      redirect("/dashboard");
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
