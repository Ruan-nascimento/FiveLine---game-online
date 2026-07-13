-- Persist Google profile photo on signup / keep handle_new_user avatar-aware.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_display text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'user_name'), '')
  );
  v_avatar text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'picture'), '')
  );
begin
  if v_username !~ '^[a-z0-9_]{3,24}$' or v_username in ('admin', 'support', 'linha5', 'mod', 'moderator') then
    v_username := public.generate_username_from_email(new.email);
  end if;
  insert into public.profiles (id, username, display_name, avatar_key)
  values (new.id, v_username, coalesce(v_display, v_username), v_avatar);
  return new;
end;
$$;
