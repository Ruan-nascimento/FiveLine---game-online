import { Suspense } from "react";
import { PlayOptions } from "@/components/game/PlayOptions";

export default function PlayPage() {
  return (
    <section className="page-shell">
      <p className="eyebrow">Escolha seu próximo desafio</p>
      <h1>Como você quer jogar?</h1>
      <Suspense fallback={<p className="muted">Carregando opções…</p>}>
        <PlayOptions />
      </Suspense>
    </section>
  );
}
