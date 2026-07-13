import { readFile } from "node:fs/promises";

function readEnv(contents) {
  return Object.fromEntries(contents.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].trim()]] : [];
  }));
}

const env = readEnv(await readFile(".env.local", "utf8"));
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = env.SUPABASE_SECRET_KEY;

if (!baseUrl || !publishableKey || !secretKey) throw new Error("SUPABASE_ENV_INCOMPLETE");

const runId = `${Date.now()}${Math.floor(Math.random() * 1_000)}`;
const password = `Linha5-${runId}-aA1!`;
const users = [];
let gameId;

async function request(path, { key, token, method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      "User-Agent": "Linha5-Multiplayer-Verification/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${data?.message ?? data?.msg ?? data?.code ?? "UNKNOWN"}`);
  return data;
}

async function createTestUser(index) {
  const email = `linha5.verify.${runId}.${index}@example.invalid`;
  const username = `verify_${runId.slice(-8)}_${index}`;
  const user = await request("/auth/v1/admin/users", {
    key: secretKey,
    method: "POST",
    body: { email, password, email_confirm: true, user_metadata: { username } },
  });
  users.push(user.id);
  const session = await request("/auth/v1/token?grant_type=password", {
    key: publishableKey,
    method: "POST",
    body: { email, password },
  });
  return { id: user.id, token: session.access_token };
}

try {
  const first = await createTestUser(1);
  const second = await createTestUser(2);
  gameId = await request("/rest/v1/rpc/create_private_room", { key: publishableKey, token: first.token, method: "POST", body: {} });
  const [waitingGame] = await request(`/rest/v1/games?id=eq.${gameId}&select=id,room_code,status`, { key: publishableKey, token: first.token });
  if (!waitingGame?.room_code || waitingGame.status !== "waiting") throw new Error("PRIVATE_ROOM_NOT_WAITING");
  const joinedGameId = await request("/rest/v1/rpc/join_private_room", { key: publishableKey, token: second.token, method: "POST", body: { p_room_code: waitingGame.room_code } });
  if (joinedGameId !== gameId) throw new Error("PRIVATE_ROOM_JOIN_RETURNED_WRONG_GAME");
  const [activeGame] = await request(`/rest/v1/games?id=eq.${gameId}&select=id,status,black_player_id,white_player_id,current_player,move_count`, { key: publishableKey, token: first.token });
  if (activeGame.status !== "active" || activeGame.move_count !== 0 || activeGame.current_player !== 1) throw new Error("PRIVATE_ROOM_NOT_ACTIVE");
  const blackToken = activeGame.black_player_id === first.id ? first.token : second.token;
  await request("/rest/v1/rpc/submit_game_move", { key: publishableKey, token: blackToken, method: "POST", body: { p_game_id: gameId, p_row: 7, p_col: 7 } });
  const [movedGame] = await request(`/rest/v1/games?id=eq.${gameId}&select=status,current_player,move_count,board`, { key: publishableKey, token: first.token });
  if (movedGame.status !== "active" || movedGame.current_player !== 2 || movedGame.move_count !== 1 || movedGame.board[7][7] !== 1) throw new Error("MOVE_STATE_INVALID");
  console.log("MULTIPLAYER_VERIFICATION_PASSED");
} finally {
  if (gameId) await request(`/rest/v1/games?id=eq.${gameId}`, { key: secretKey, method: "DELETE" }).catch(() => undefined);
  await Promise.all(users.map((id) => request(`/auth/v1/admin/users/${id}`, { key: secretKey, method: "DELETE" }).catch(() => undefined)));
}
