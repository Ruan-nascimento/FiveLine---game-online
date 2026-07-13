import { JoinPrivateRoom } from "@/components/multiplayer/PrivateRoom";
import { Suspense } from "react";
export default function JoinRoomPage() { return <section className="page-shell"><Suspense fallback={<p>Carregando sala…</p>}><JoinPrivateRoom /></Suspense></section>; }
