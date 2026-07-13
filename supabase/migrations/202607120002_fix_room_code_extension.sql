-- Supabase installs pgcrypto in the `extensions` schema. The RPCs use a
-- restricted search_path, so the schema must be explicit when generating codes.
create or replace function public.new_room_code() returns text language plpgsql volatile set search_path = public as $$
declare v_code text;
begin
  loop
    v_code := upper(substring(encode(extensions.gen_random_bytes(4), 'hex') from 1 for 6));
    exit when not exists (select 1 from public.games where room_code = v_code);
  end loop;
  return v_code;
end;
$$;
