import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { es } from "@/lib/i18n/es";

export default function RecuperarContrasenaPage() {
  return (
    <section className="mx-auto max-w-md space-y-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{es.passwordReset.forgotTitle}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {es.passwordReset.forgotSubtitle}
        </p>
      </div>
      <ForgotPasswordForm />
    </section>
  );
}
