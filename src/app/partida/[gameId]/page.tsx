import { OnlineGame } from "@/components/multiplayer/OnlineGame";
export default async function OnlineGamePage({ params }: { params: Promise<{ gameId: string }> }) { const { gameId } = await params; return <OnlineGame gameId={gameId} />; }
