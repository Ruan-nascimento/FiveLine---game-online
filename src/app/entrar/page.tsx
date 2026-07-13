import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <section className="page-shell">
      <Suspense fallback={<p className="muted">Carregando…</p>}>
        <AuthForm />
      </Suspense>
    </section>
  );
}
