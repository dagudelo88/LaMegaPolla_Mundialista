import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { getSessionUser } from "@/lib/auth/require-admin";
import { es } from "@/lib/i18n/es";

export default async function ActualizarContrasenaPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/recuperar-contrasena");
  }

  return (
    <section className="mx-auto max-w-md space-y-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{es.passwordReset.updateTitle}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {es.passwordReset.updateSubtitle}
        </p>
      </div>
      <UpdatePasswordForm />
    </section>
  );
}
