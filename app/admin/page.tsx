import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { InviteGenerator } from "@/components/admin/invite-generator";
import { es } from "@/lib/i18n/es";

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: codes } = await admin
    .from("invitation_codes")
    .select("code, uses_count, max_uses, created_at, expires_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: users } = await admin
    .from("profiles")
    .select("username, role, total_points, joined_at")
    .order("joined_at", { ascending: true });

  return (
    <section className="space-y-8">
      <h1 className="text-3xl font-bold">{es.admin.title}</h1>

      <InviteGenerator />

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="mb-3 text-lg font-semibold">{es.admin.invites}</h2>
        {codes?.length ? (
          <ul className="space-y-2 font-mono text-sm">
            {codes.map((c) => (
              <li key={c.code} className="flex justify-between gap-4 border-b border-[var(--color-border)] py-2">
                <span>{c.code}</span>
                <span className="text-[var(--color-muted-foreground)]">
                  {c.uses_count}/{c.max_uses}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {es.admin.noCodes}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="mb-3 text-lg font-semibold">{es.admin.users}</h2>
        <ul className="space-y-2 text-sm">
          {(users ?? []).map((u) => (
            <li
              key={u.username ?? Math.random()}
              className="flex justify-between border-b border-[var(--color-border)] py-2"
            >
              <span>
                @{u.username ?? "—"} ({u.role})
              </span>
              <span>{u.total_points} pts</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
