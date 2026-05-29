import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { es } from "@/lib/i18n/es";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md space-y-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{es.login.title}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">{es.login.subtitle}</p>
      </div>
      <Suspense fallback={<p className="text-center text-sm">...</p>}>
        <LoginForm />
      </Suspense>
    </section>
  );
}
