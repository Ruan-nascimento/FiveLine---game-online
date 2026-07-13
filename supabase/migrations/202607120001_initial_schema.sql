-- Linha 5: server-authoritative multiplayer schema. Apply with `supabase db push`.
create extension if not exists pgcrypto;

create type public.game_mode as enum ('online_quick', 'online_private');
create type public.game_visibility as enum ('private', 'participants_only');
create type public.game_status as enum ('waiting', 'active', 'finished', 'cancelled', 'expired');
create type public.game_result as enum ('black_win', 'white_win', 'draw');
create type public.game_result_reason as enum ('five_in_row', 'resignation', 'disconnect', 'board_full');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text,
  avatar_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  constraint username_not_reserved check (username not in ('admin', 'support', 'linha5', 'mod', 'moderator'))
);
create unique index profiles_username_lower_unique on public.profiles (lower(username));

create table public.games (
  id uuid primary key default gen_random_uuid(),
  mode public.game_mode not null,
  visibility public.game_visibility not null,
  status public.game_status not null default 'waiting',
  room_code text unique,
  black_player_id uuid references public.profiles(id) on delete set null,
  white_player_id uuid references public.profiles(id) on delete set null,
  current_player smallint not null default 1 check (current_player in (1, 2)),
  winner_player_id uuid references public.profiles(id) on delete set null,
  result public.game_result,
  result_reason public.game_result_reason,
  board jsonb not null,
  winning_line jsonb not null default '[]'::jsonb,
  move_count integer not null default 0 check (move_count between 0 and 225),
  last_move_row smallint check (last_move_row between 0 and 14),
  last_move_col smallint check (last_move_col between 0 and 14),
  black_last_seen_at timestamptz,
  white_last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint private_room_code check ((mode = 'online_private' and room_code is not null) or (mode = 'online_quick' and room_code is null)),
  constraint distinct_players check (black_player_id is null or white_player_id is null or black_player_id <> white_player_id),
  constraint completed_game_result check ((status = 'finished' and result is not null and result_reason is not null) or status <> 'finished')
);
create index games_participants_idx on public.games (black_player_id, white_player_id);
create index games_room_code_idx on public.games (room_code) where status = 'waiting';

create table public.game_moves (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete restrict,
  move_number integer not null check (move_number between 1 and 225),
  row smallint not null check (row between 0 and 14),
  col smallint not null check (col between 0 and 14),
  piece smallint not null check (piece in (1, 2)),
  created_at timestamptz not null default now(),
  unique (game_id, move_number),
  unique (game_id, row, col)
);
create index game_moves_game_id_idx on public.game_moves (game_id, move_number);

create table public.matchmaking_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'waiting' check (status = 'waiting'),
  joined_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now()
);

create table public.rematch_requests (
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create function public.protect_profile_identity() returns trigger language plpgsql as $$
begin
  if new.id <> old.id or new.username <> old.username then raise exception 'PROFILE_IDENTITY_IMMUTABLE'; end if;
  return new;
end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger profiles_identity_immutable before update on public.profiles for each row execute function public.protect_profile_identity();
create trigger games_updated_at before update on public.games for each row execute function public.touch_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare v_username text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
begin
  if v_username !~ '^[a-z0-9_]{3,24}$' or v_username in ('admin', 'support', 'linha5', 'mod', 'moderator') then
    raise exception 'INVALID_USERNAME';
  end if;
  insert into public.profiles (id, username, display_name) values (new.id, v_username, v_username);
  return new;
end;
$$;
create trigger auth_user_profile after insert on auth.users for each row execute procedure public.handle_new_user();

create function public.gomoku_empty_board() returns jsonb language sql immutable as $$
  select jsonb_agg(to_jsonb(array_fill(0, array[15]))) from generate_series(1, 15);
$$;

-- Returns every contiguous coordinate crossing the last move; an empty array means no winner.
create function public.gomoku_winning_line(p_board jsonb, p_row smallint, p_col smallint, p_piece smallint)
returns jsonb language plpgsql immutable set search_path = public as $$
declare
  v_dr integer; v_dc integer; v_row integer; v_col integer; v_count integer; v_line jsonb;
begin
  for v_dr, v_dc in select * from (values (1,0), (0,1), (1,1), (1,-1)) as directions(dr, dc) loop
    v_line := '[]'::jsonb; v_count := 0;
    v_row := p_row - v_dr; v_col := p_col - v_dc;
    while v_row between 0 and 14 and v_col between 0 and 14 and coalesce((p_board #>> array[v_row::text, v_col::text])::integer, 0) = p_piece loop
      v_line := jsonb_build_array(jsonb_build_object('row', v_row, 'col', v_col)) || v_line;
      v_count := v_count + 1; v_row := v_row - v_dr; v_col := v_col - v_dc;
    end loop;
    v_line := v_line || jsonb_build_array(jsonb_build_object('row', p_row, 'col', p_col));
    v_count := v_count + 1; v_row := p_row + v_dr; v_col := p_col + v_dc;
    while v_row between 0 and 14 and v_col between 0 and 14 and coalesce((p_board #>> array[v_row::text, v_col::text])::integer, 0) = p_piece loop
      v_line := v_line || jsonb_build_array(jsonb_build_object('row', v_row, 'col', v_col));
      v_count := v_count + 1; v_row := v_row + v_dr; v_col := v_col + v_dc;
    end loop;
    if v_count >= 5 then return v_line; end if;
  end loop;
  return '[]'::jsonb;
end;
$$;

create function public.new_room_code() returns text language plpgsql volatile set search_path = public as $$
declare v_code text;
begin
  loop
    v_code := upper(substring(encode(extensions.gen_random_bytes(4), 'hex') from 1 for 6));
    exit when not exists (select 1 from public.games where room_code = v_code);
  end loop;
  return v_code;
end;
$$;

create function public.assert_game_participant(p_game public.games, p_user uuid) returns void language plpgsql stable set search_path = public as $$
begin
  if p_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_game.black_player_id <> p_user and p_game.white_player_id <> p_user then raise exception 'NOT_A_PARTICIPANT' using errcode = '42501'; end if;
end;
$$;

create function public.create_private_room() returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if exists (select 1 from public.games where status in ('waiting', 'active') and (black_player_id = v_user or white_player_id = v_user)) then raise exception 'ACTIVE_GAME_EXISTS'; end if;
  insert into public.games (mode, visibility, status, room_code, black_player_id, current_player, board, black_last_seen_at)
  values ('online_private', 'private', 'waiting', public.new_room_code(), v_user, 1, public.gomoku_empty_board(), now()) returning id into v_game_id;
  return v_game_id;
end;
$$;

create function public.join_private_room(p_room_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game public.games; v_game_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_game from public.games where room_code = upper(trim(p_room_code)) for update;
  if not found or v_game.status <> 'waiting' or v_game.mode <> 'online_private' then raise exception 'ROOM_NOT_AVAILABLE'; end if;
  if v_game.black_player_id = v_user then raise exception 'CANNOT_JOIN_OWN_ROOM'; end if;
  if exists (select 1 from public.games where status in ('waiting', 'active') and (black_player_id = v_user or white_player_id = v_user)) then raise exception 'ACTIVE_GAME_EXISTS'; end if;
  if random() < 0.5 then
    update public.games set black_player_id = v_user, white_player_id = v_game.black_player_id, status = 'active', started_at = now(), black_last_seen_at = now(), white_last_seen_at = now() where id = v_game.id returning id into v_game_id;
  else
    update public.games set white_player_id = v_user, status = 'active', started_at = now(), white_last_seen_at = now() where id = v_game.id returning id into v_game_id;
  end if;
  return v_game_id;
end;
$$;

create function public.cancel_private_room(p_game_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  update public.games set status = 'cancelled', finished_at = now() where id = p_game_id and status = 'waiting' and black_player_id = v_user;
  if not found then raise exception 'ROOM_CANNOT_BE_CANCELLED'; end if;
end;
$$;

create function public.find_or_create_match() returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_other uuid; v_game_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select id into v_game_id from public.games where status in ('waiting', 'active') and (black_player_id = v_user or white_player_id = v_user) order by created_at desc limit 1;
  if v_game_id is not null then return v_game_id; end if;
  insert into public.matchmaking_queue (user_id, heartbeat_at) values (v_user, now()) on conflict (user_id) do update set heartbeat_at = excluded.heartbeat_at;
  select user_id into v_other from public.matchmaking_queue where user_id <> v_user and heartbeat_at > now() - interval '90 seconds' order by joined_at for update skip locked limit 1;
  if v_other is null then return null; end if;
  if random() < 0.5 then
    insert into public.games (mode, visibility, status, black_player_id, white_player_id, current_player, board, started_at, black_last_seen_at, white_last_seen_at)
    values ('online_quick', 'participants_only', 'active', v_user, v_other, 1, public.gomoku_empty_board(), now(), now(), now()) returning id into v_game_id;
  else
    insert into public.games (mode, visibility, status, black_player_id, white_player_id, current_player, board, started_at, black_last_seen_at, white_last_seen_at)
    values ('online_quick', 'participants_only', 'active', v_other, v_user, 1, public.gomoku_empty_board(), now(), now(), now()) returning id into v_game_id;
  end if;
  delete from public.matchmaking_queue where user_id in (v_user, v_other);
  return v_game_id;
end;
$$;

create function public.enter_matchmaking() returns uuid language sql security definer set search_path = public as $$ select public.find_or_create_match(); $$;
create function public.leave_matchmaking() returns void language plpgsql security definer set search_path = public as $$ begin delete from public.matchmaking_queue where user_id = auth.uid(); end; $$;

create function public.submit_game_move(p_game_id uuid, p_row smallint, p_col smallint) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game public.games; v_piece smallint; v_board jsonb; v_line jsonb; v_result public.game_result; v_reason public.game_result_reason;
begin
  if p_row not between 0 and 14 or p_col not between 0 and 14 then raise exception 'MOVE_OUT_OF_BOUNDS'; end if;
  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status <> 'active' then raise exception 'GAME_NOT_ACTIVE'; end if;
  v_piece := case when v_game.black_player_id = v_user then 1 else 2 end;
  if v_game.current_player <> v_piece then raise exception 'NOT_YOUR_TURN'; end if;
  if coalesce((v_game.board #>> array[p_row::text, p_col::text])::integer, 0) <> 0 then raise exception 'CELL_OCCUPIED'; end if;
  v_board := jsonb_set(v_game.board, array[p_row::text, p_col::text], to_jsonb(v_piece), false);
  v_line := public.gomoku_winning_line(v_board, p_row, p_col, v_piece);
  if jsonb_array_length(v_line) > 0 then v_result := case when v_piece = 1 then 'black_win' else 'white_win' end; v_reason := 'five_in_row'; end if;
  if v_result is null and v_game.move_count + 1 = 225 then v_result := 'draw'; v_reason := 'board_full'; end if;
  insert into public.game_moves (game_id, player_id, move_number, row, col, piece) values (p_game_id, v_user, v_game.move_count + 1, p_row, p_col, v_piece);
  update public.games set
    board = v_board, move_count = v_game.move_count + 1, last_move_row = p_row, last_move_col = p_col, winning_line = v_line,
    current_player = case when v_result is null then 3 - v_piece else v_piece end,
    status = case when v_result is not null then 'finished'::public.game_status else 'active'::public.game_status end,
    winner_player_id = case when v_result in ('black_win'::public.game_result, 'white_win'::public.game_result) then v_user else null end,
    result = v_result,
    result_reason = v_reason,
    finished_at = case when v_result is not null then now() else null end,
    black_last_seen_at = case when v_piece = 1 then now() else black_last_seen_at end,
    white_last_seen_at = case when v_piece = 2 then now() else white_last_seen_at end
  where id = p_game_id;
  return jsonb_build_object('success', true, 'game_id', p_game_id);
end;
$$;

create function public.resign_game(p_game_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game public.games; v_winner uuid; v_result public.game_result;
begin
  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status <> 'active' then raise exception 'GAME_NOT_ACTIVE'; end if;
  v_winner := case when v_game.black_player_id = v_user then v_game.white_player_id else v_game.black_player_id end;
  v_result := case when v_winner = v_game.black_player_id then 'black_win' else 'white_win' end;
  update public.games set status = 'finished', winner_player_id = v_winner, result = v_result, result_reason = 'resignation', finished_at = now() where id = p_game_id;
end;
$$;

create function public.request_rematch(p_game_id uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game public.games; v_count integer; v_new_game uuid;
begin
  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status <> 'finished' then raise exception 'REMATCH_NOT_AVAILABLE'; end if;
  insert into public.rematch_requests (game_id, player_id) values (p_game_id, v_user) on conflict do nothing;
  select count(*) into v_count from public.rematch_requests where game_id = p_game_id;
  if v_count < 2 then return null; end if;
  insert into public.games (mode, visibility, status, black_player_id, white_player_id, current_player, board, started_at, black_last_seen_at, white_last_seen_at)
  values (v_game.mode, v_game.visibility, 'active', v_game.white_player_id, v_game.black_player_id, 1, public.gomoku_empty_board(), now(), now(), now()) returning id into v_new_game;
  delete from public.rematch_requests where game_id = p_game_id;
  return v_new_game;
end;
$$;
create function public.accept_rematch(p_game_id uuid) returns uuid language sql security definer set search_path = public as $$ select public.request_rematch(p_game_id); $$;

create function public.touch_game_connection(p_game_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game public.games;
begin
  select * into v_game from public.games where id = p_game_id for update; perform public.assert_game_participant(v_game, v_user);
  update public.games set black_last_seen_at = case when black_player_id = v_user then now() else black_last_seen_at end, white_last_seen_at = case when white_player_id = v_user then now() else white_last_seen_at end where id = p_game_id;
end;
$$;

create function public.handle_disconnected_player(p_game_id uuid, p_disconnected_player uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game public.games; v_seen timestamptz; v_winner uuid; v_result public.game_result;
begin
  select * into v_game from public.games where id = p_game_id for update; if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status <> 'active' or p_disconnected_player not in (v_game.black_player_id, v_game.white_player_id) then raise exception 'DISCONNECT_NOT_ACTIONABLE'; end if;
  v_seen := case when p_disconnected_player = v_game.black_player_id then v_game.black_last_seen_at else v_game.white_last_seen_at end;
  if v_seen is null or v_seen > now() - interval '120 seconds' then raise exception 'RECONNECT_GRACE_ACTIVE'; end if;
  v_winner := case when p_disconnected_player = v_game.black_player_id then v_game.white_player_id else v_game.black_player_id end;
  v_result := case when v_winner = v_game.black_player_id then 'black_win' else 'white_win' end;
  update public.games set status = 'finished', winner_player_id = v_winner, result = v_result, result_reason = 'disconnect', finished_at = now() where id = p_game_id;
end;
$$;

create function public.expire_old_rooms() returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update public.games set status = 'expired', finished_at = now() where status = 'waiting' and created_at < now() - interval '30 minutes';
  get diagnostics v_count = row_count;
  delete from public.matchmaking_queue where heartbeat_at < now() - interval '90 seconds';
  return v_count;
end;
$$;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_moves enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.rematch_requests enable row level security;
create policy "profiles are readable by signed-in players" on public.profiles for select to authenticated using (true);
create policy "players update only their profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and username = (select username from public.profiles where id = auth.uid()));
create policy "participants read games" on public.games for select to authenticated using (auth.uid() = black_player_id or auth.uid() = white_player_id);
create policy "participants read moves" on public.game_moves for select to authenticated using (exists (select 1 from public.games where games.id = game_moves.game_id and (games.black_player_id = auth.uid() or games.white_player_id = auth.uid())));
create policy "players see their queue entry" on public.matchmaking_queue for select to authenticated using (user_id = auth.uid());
create policy "participants read rematch requests" on public.rematch_requests for select to authenticated using (exists (select 1 from public.games where games.id = rematch_requests.game_id and (games.black_player_id = auth.uid() or games.white_player_id = auth.uid())));

revoke all on all tables in schema public from anon;
revoke all on function public.create_private_room(), public.join_private_room(text), public.cancel_private_room(uuid), public.find_or_create_match(), public.enter_matchmaking(), public.leave_matchmaking(), public.submit_game_move(uuid, smallint, smallint), public.resign_game(uuid), public.request_rematch(uuid), public.accept_rematch(uuid), public.touch_game_connection(uuid), public.handle_disconnected_player(uuid, uuid) from public;
grant execute on function public.create_private_room(), public.join_private_room(text), public.cancel_private_room(uuid), public.find_or_create_match(), public.enter_matchmaking(), public.leave_matchmaking(), public.submit_game_move(uuid, smallint, smallint), public.resign_game(uuid), public.request_rematch(uuid), public.accept_rematch(uuid), public.touch_game_connection(uuid), public.handle_disconnected_player(uuid, uuid) to authenticated;
revoke all on function public.expire_old_rooms() from public;
grant execute on function public.expire_old_rooms() to service_role;

alter publication supabase_realtime add table public.games;
