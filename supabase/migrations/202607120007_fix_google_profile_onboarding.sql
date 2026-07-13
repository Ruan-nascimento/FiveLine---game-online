-- Ensure Google OAuth can create profiles without a username in user metadata.
-- Fixes "Database error saving new user" when signing in with Google.

create or replace function public.generate_username_from_email(p_email text)
returns text language plpgsql volatile set search_path = public as $$
declare
  v_base text;
  v_candidate text;
  v_suffix integer := 0;
begin
  v_base := lower(regexp_replace(split_part(coalesce(p_email, 'player'), '@', 1), '[^a-z0-9_]', '', 'g'));
  if char_length(v_base) < 3 then v_base := 'player'; end if;
  v_base := substring(v_base from 1 for 18);
  loop
    v_candidate := case when v_suffix = 0 then v_base else v_base || v_suffix::text end;
    exit when char_length(v_candidate) between 3 and 24
      and v_candidate ~ '^[a-z0-9_]{3,24}$'
      and v_candidate not in ('admin', 'support', 'linha5', 'mod', 'moderator')
      and not exists (select 1 from public.profiles where lower(username) = lower(v_candidate));
    v_suffix := v_suffix + 1;
    if v_suffix > 9999 then raise exception 'USERNAME_GENERATION_FAILED'; end if;
  end loop;
  return v_candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_display text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'user_name'), '')
  );
begin
  if v_username !~ '^[a-z0-9_]{3,24}$' or v_username in ('admin', 'support', 'linha5', 'mod', 'moderator') then
    v_username := public.generate_username_from_email(new.email);
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, coalesce(v_display, v_username));
  return new;
end;
$$;
