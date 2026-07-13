import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function credentials(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return { url, key };
}

export async function createClient() {
  const { url, key } = credentials();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries) => { try { entries.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components refresh sessions in middleware. */ } },
    },
  });
}
