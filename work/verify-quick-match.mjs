import { readFile } from "node:fs/promises";

const values = Object.fromEntries((await readFile(".env.local", "utf8")).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].trim()]] : [];
}));
const { NEXT_PUBLIC_SUPABASE_URL: baseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: publishableKey, SUPABASE_SECRET_KEY: secretKey } = values;
if (!baseUrl || !publishableKey || !secretKey) throw new Error("SUPABASE_ENV_INCOMPLETE");

const runId = `${Date.now()}${Math.floor(Math.random() * 1_000)}`;
const password = `Linha5-${runId}-aA1!`;
const userIds = [];
let gameId;

async function request(path, { key, token, method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}), "User-Agent": "Linha5-Multiplayer-Verification/1.0" }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${data?.message ?? data?.msg ?? data?.code ?? "UNKNOWN"}`);
  return data;
}

async function user(index) {
  const email = `linha5.quick.${runId}.${index}@example.invalid`;
  const username = `quick_${runId.slice(-8)}_${index}`;
  const created = await request("/auth/v1/admin/users", { key: secretKey, method: "POST", body: { email, password, email_confirm: true, user_metadata: { username } } });
  userIds.push(created.id);
  const session = await request("/auth/v1/token?grant_type=password", { key: publishableKey, method: "POST", body: { email, password } });
  return { id: created.id, token: session.access_token };
}

try {
  const first = await user(1);
  const second = await user(2);
  const firstResult = await request("/rest/v1/rpc/find_or_create_match", { key: publishableKey, token: first.token, method: "POST", body: {} });
  if (firstResult !== null) throw new Error("FIRST_MATCHMAKING_REQUEST_SHOULD_WAIT");
  gameId = await request("/rest/v1/rpc/find_or_create_match", { key: publishableKey, token: second.token, method: "POST", body: {} });
  const firstGameId = await request("/rest/v1/rpc/find_or_create_match", { key: publishableKey, token: first.token, method: "POST", body: {} });
  if (!gameId || firstGameId !== gameId) throw new Error("MATCHMAKING_DID_NOT_CREATE_ONE_SHARED_GAME");
  const [game] = await request(`/rest/v1/games?id=eq.${gameId}&select=status,black_player_id,current_player,move_count`, { key: publishableKey, token: first.token });
  const blackToken = game.black_player_id === first.id ? first.token : second.token;
  await request("/rest/v1/rpc/submit_game_move", { key: publishableKey, token: blackToken, method: "POST", body: { p_game_id: gameId, p_row: 7, p_col: 7 } });
  const [moved] = await request(`/rest/v1/games?id=eq.${gameId}&select=status,current_player,move_count,board`, { key: publishableKey, token: first.token });
  if (moved.status !== "active" || moved.current_player !== 2 || moved.move_count !== 1 || moved.board[7][7] !== 1) throw new Error("SERVER_MOVE_STATE_INVALID");
  console.log("QUICK_MATCH_AND_SERVER_MOVE_VERIFICATION_PASSED");
} finally {
  if (gameId) await request(`/rest/v1/games?id=eq.${gameId}`, { key: secretKey, method: "DELETE" }).catch(() => undefined);
  await Promise.all(userIds.map((id) => request(`/auth/v1/admin/users/${id}`, { key: secretKey, method: "DELETE" }).catch(() => undefined)));
}
