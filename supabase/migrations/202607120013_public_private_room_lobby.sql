-- Public vs private waiting rooms + lobby listing.

alter table public.games
  add column if not exists is_public boolean not null default false;

comment on column public.games.is_public is
  'Waiting rooms listed in the lobby. Public rooms join by click; private rooms require room_code.';

create index if not exists games_open_lobby_idx
  on public.games (created_at desc)
  where status = 'waiting' and mode = 'online_private';

drop function if exists public.create_private_room();

create function public.create_private_room(p_is_public boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_game_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if exists (
    select 1 from public.games
    where status in ('waiting', 'active')
      and (black_player_id = v_user or white_player_id = v_user)
  ) then
    raise exception 'ACTIVE_GAME_EXISTS';
  end if;

  insert into public.games (
    mode, visibility, is_public, status, room_code,
    black_player_id, current_player, board, black_last_seen_at
  )
  values (
    'online_private',
    'private',
    coalesce(p_is_public, false),
    'waiting',
    public.new_room_code(),
    v_user,
    1,
    public.gomoku_empty_board(),
    now()
  )
  returning id into v_game_id;

  return v_game_id;
end;
$$;

-- Shared activation when a second player joins a waiting room.
create or replace function public.activate_waiting_room(p_game public.games, p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id uuid;
begin
  if p_game.black_player_id = p_user then raise exception 'CANNOT_JOIN_OWN_ROOM'; end if;
  if exists (
    select 1 from public.games
    where status in ('waiting', 'active')
      and (black_player_id = p_user or white_player_id = p_user)
  ) then
    raise exception 'ACTIVE_GAME_EXISTS';
  end if;

  if random() < 0.5 then
    update public.games
    set
      black_player_id = p_user,
      white_player_id = p_game.black_player_id,
      status = 'active',
      started_at = now(),
      black_last_seen_at = now(),
      white_last_seen_at = now(),
      turn_deadline_at = now() + interval '30 seconds'
    where id = p_game.id
    returning id into v_game_id;
  else
    update public.games
    set
      white_player_id = p_user,
      status = 'active',
      started_at = now(),
      white_last_seen_at = now(),
      turn_deadline_at = now() + interval '30 seconds'
    where id = p_game.id
    returning id into v_game_id;
  end if;

  return v_game_id;
end;
$$;

create or replace function public.join_private_room(p_room_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_game
  from public.games
  where room_code = upper(trim(p_room_code))
  for update;
  if not found or v_game.status <> 'waiting' or v_game.mode <> 'online_private' then
    raise exception 'ROOM_NOT_AVAILABLE';
  end if;
  return public.activate_waiting_room(v_game, v_user);
end;
$$;

create or replace function public.join_public_room(p_game_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_game from public.games where id = p_game_id for update;
  if not found
     or v_game.status <> 'waiting'
     or v_game.mode <> 'online_private'
     or v_game.is_public is not true then
    raise exception 'ROOM_NOT_AVAILABLE';
  end if;
  return public.activate_waiting_room(v_game, v_user);
end;
$$;

-- Up to 50 random waiting rooms for the lobby (never leaks private codes).
create or replace function public.list_open_rooms(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  return coalesce((
    select jsonb_agg(to_jsonb(room) order by room.is_public desc, room.created_at desc)
    from (
      select
        g.id,
        g.is_public,
        g.created_at,
        case when g.is_public then g.room_code else null end as room_code,
        g.black_player_id as host_id,
        coalesce(nullif(trim(p.display_name), ''), p.username, 'Jogador') as host_name,
        p.username as host_username,
        p.avatar_key as host_avatar
      from public.games g
      left join public.profiles p on p.id = g.black_player_id
      where g.status = 'waiting'
        and g.mode = 'online_private'
        and g.white_player_id is null
      order by random()
      limit v_limit
    ) room
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.create_private_room(boolean) from public;
revoke all on function public.join_public_room(uuid) from public;
revoke all on function public.list_open_rooms(integer) from public;
revoke all on function public.activate_waiting_room(public.games, uuid) from public;

grant execute on function public.create_private_room(boolean) to authenticated;
grant execute on function public.join_public_room(uuid) to authenticated;
grant execute on function public.list_open_rooms(integer) to authenticated;
-- activate_waiting_room is internal; not granted to clients
