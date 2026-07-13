import { PlayerAccount } from "@/components/profile/PlayerAccount";

export default async function PlayerPublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PlayerAccount profileUsername={username} />;
}
