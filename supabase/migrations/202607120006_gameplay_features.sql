-- Gameplay features: turn timer, chat, Google username onboarding, turn timeout forfeit.

alter type public.game_result_reason add value if not exists 'turn_timeout';

alter table public.games
  add column if not exists turn_deadline_at timestamptz;

create table if not exists public.game_messages (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists game_messages_game_id_idx on public.game_messages (game_id, created_at);

alter table public.game_messages enable row level security;
create policy "participants read game messages" on public.game_messages
  for select to authenticated
  using (exists (
    select 1 from public.games
    where games.id = game_messages.game_id
      and (games.black_player_id = auth.uid() or games.white_player_id = auth.uid())
  ));
create policy "participants send game messages" on public.game_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.games
      where games.id = game_messages.game_id
        and games.status in ('waiting', 'active')
        and (games.black_player_id = auth.uid() or games.white_player_id = auth.uid())
    )
  );

alter publication supabase_realtime add table public.game_messages;

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
  v_display text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(trim(new.raw_user_meta_data ->> 'name'), ''));
begin
  if v_username !~ '^[a-z0-9_]{3,24}$' or v_username in ('admin', 'support', 'linha5', 'mod', 'moderator') then
    v_username := public.generate_username_from_email(new.email);
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, coalesce(v_display, v_username));
  return new;
end;
$$;

create or replace function public.send_game_message(p_game_id uuid, p_body text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
  v_message_id bigint;
  v_body text := trim(p_body);
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 280 then raise exception 'MESSAGE_INVALID_LENGTH'; end if;
  select * into v_game from public.games where id = p_game_id;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status not in ('waiting', 'active') then raise exception 'GAME_NOT_ACTIVE'; end if;
  insert into public.game_messages (game_id, sender_id, body) values (p_game_id, v_user, v_body) returning id into v_message_id;
  return v_message_id;
end;
$$;

create or replace function public.forfeit_timed_out_turn(p_game_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
  v_winner uuid;
  v_result public.game_result;
begin
  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status <> 'active' or v_game.turn_deadline_at is null or v_game.turn_deadline_at > now() then
    return false;
  end if;
  v_winner := case
    when v_game.current_player = 1 then v_game.white_player_id
    else v_game.black_player_id
  end;
  v_result := case when v_winner = v_game.black_player_id then 'black_win' else 'white_win' end;
  update public.games set
    status = 'finished',
    winner_player_id = v_winner,
    result = v_result,
    result_reason = 'turn_timeout',
    finished_at = now(),
    turn_deadline_at = null
  where id = p_game_id;
  return true;
end;
$$;

create or replace function public.join_private_room(p_room_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game public.games; v_game_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_game from public.games where room_code = upper(trim(p_room_code)) for update;
  if not found or v_game.status <> 'waiting' or v_game.mode <> 'online_private' then raise exception 'ROOM_NOT_AVAILABLE'; end if;
  if v_game.black_player_id = v_user then raise exception 'CANNOT_JOIN_OWN_ROOM'; end if;
  if exists (select 1 from public.games where status in ('waiting', 'active') and (black_player_id = v_user or white_player_id = v_user)) then raise exception 'ACTIVE_GAME_EXISTS'; end if;
  if random() < 0.5 then
    update public.games set black_player_id = v_user, white_player_id = v_game.black_player_id, status = 'active', started_at = now(), black_last_seen_at = now(), white_last_seen_at = now(), turn_deadline_at = now() + interval '30 seconds' where id = v_game.id returning id into v_game_id;
  else
    update public.games set white_player_id = v_user, status = 'active', started_at = now(), white_last_seen_at = now(), turn_deadline_at = now() + interval '30 seconds' where id = v_game.id returning id into v_game_id;
  end if;
  return v_game_id;
end;
$$;

create or replace function public.find_or_create_match()
returns uuid language plpgsql security definer set search_path = public as $$
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
    insert into public.games (mode, visibility, status, black_player_id, white_player_id, current_player, board, started_at, black_last_seen_at, white_last_seen_at, turn_deadline_at)
    values ('online_quick', 'participants_only', 'active', v_user, v_other, 1, public.gomoku_empty_board(), now(), now(), now(), now() + interval '30 seconds') returning id into v_game_id;
  else
    insert into public.games (mode, visibility, status, black_player_id, white_player_id, current_player, board, started_at, black_last_seen_at, white_last_seen_at, turn_deadline_at)
    values ('online_quick', 'participants_only', 'active', v_other, v_user, 1, public.gomoku_empty_board(), now(), now(), now(), now() + interval '30 seconds') returning id into v_game_id;
  end if;
  delete from public.matchmaking_queue where user_id in (v_user, v_other);
  return v_game_id;
end;
$$;

create or replace function public.submit_game_move(p_game_id uuid, p_row smallint, p_col smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game public.games; v_piece smallint; v_board jsonb; v_line jsonb; v_result public.game_result; v_reason public.game_result_reason;
begin
  if p_row not between 0 and 14 or p_col not between 0 and 14 then raise exception 'MOVE_OUT_OF_BOUNDS'; end if;
  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status <> 'active' then raise exception 'GAME_NOT_ACTIVE'; end if;
  if v_game.turn_deadline_at is not null and v_game.turn_deadline_at <= now() then
    perform public.forfeit_timed_out_turn(p_game_id);
    raise exception 'TURN_TIMED_OUT';
  end if;
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
    turn_deadline_at = case when v_result is null then now() + interval '30 seconds' else null end,
    black_last_seen_at = case when v_piece = 1 then now() else black_last_seen_at end,
    white_last_seen_at = case when v_piece = 2 then now() else white_last_seen_at end
  where id = p_game_id;
  return jsonb_build_object('success', true, 'game_id', p_game_id);
end;
$$;

create or replace function public.request_rematch(p_game_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game public.games; v_count integer; v_new_game uuid;
begin
  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status <> 'finished' then raise exception 'REMATCH_NOT_AVAILABLE'; end if;
  insert into public.rematch_requests (game_id, player_id) values (p_game_id, v_user) on conflict do nothing;
  select count(*) into v_count from public.rematch_requests where game_id = p_game_id;
  if v_count < 2 then return null; end if;
  insert into public.games (mode, visibility, status, black_player_id, white_player_id, current_player, board, started_at, black_last_seen_at, white_last_seen_at, turn_deadline_at)
  values (v_game.mode, v_game.visibility, 'active', v_game.white_player_id, v_game.black_player_id, 1, public.gomoku_empty_board(), now(), now(), now(), now() + interval '30 seconds') returning id into v_new_game;
  delete from public.rematch_requests where game_id = p_game_id;
  return v_new_game;
end;
$$;

revoke all on table public.game_messages from anon;
grant select, insert on table public.game_messages to authenticated;
revoke all on function public.send_game_message(uuid, text), public.forfeit_timed_out_turn(uuid), public.generate_username_from_email(text) from public;
grant execute on function public.send_game_message(uuid, text), public.forfeit_timed_out_turn(uuid) to authenticated;
