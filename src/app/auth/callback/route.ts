import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { avatarFromUser } from "@/lib/supabase/avatar";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/multiplayer";

  if (!code) {
    return NextResponse.redirect(`${origin}/entrar?error=auth`);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data.user ?? data.session?.user;
      const avatar = avatarFromUser(user);
      if (user && avatar) {
        await supabase.from("profiles").update({ avatar_key: avatar }).eq("id", user.id);
      }
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/multiplayer"}`);
    }
  } catch {
    /* Supabase not configured */
  }

  return NextResponse.redirect(`${origin}/entrar?error=auth`);
}
