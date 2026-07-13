import { Suspense } from "react";
import { CreatePrivateRoom } from "@/components/multiplayer/PrivateRoom";

export default function CreateRoomPage() {
  return (
    <section className="page-shell">
      <Suspense fallback={<p className="muted">Carregando…</p>}>
        <CreatePrivateRoom />
      </Suspense>
    </section>
  );
}
