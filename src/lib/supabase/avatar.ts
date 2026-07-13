import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export function avatarFromUser(user: User | null | undefined): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const value = meta.avatar_url ?? meta.picture ?? meta.avatar ?? null;
  return typeof value === "string" && value.startsWith("http") ? value : null;
}

/** Keeps profiles.avatar_key in sync with the Google profile photo. */
export async function syncProfileAvatar(
  supabase: SupabaseClient,
  user: User,
): Promise<string | null> {
  const avatar = avatarFromUser(user);
  if (!avatar) return null;
  await supabase.from("profiles").update({ avatar_key: avatar }).eq("id", user.id);
  return avatar;
}
