import { signInWithGoogle } from "@/app/actions/auth";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md space-y-6 py-12 text-center">
      <h1 className="text-3xl font-bold">{es.login.title}</h1>
      <p className="text-[var(--color-muted-foreground)]">{es.login.subtitle}</p>
      <form action={signInWithGoogle}>
        <Button type="submit" size="lg" className="w-full">
          {es.login.button}
        </Button>
      </form>
    </section>
  );
}
