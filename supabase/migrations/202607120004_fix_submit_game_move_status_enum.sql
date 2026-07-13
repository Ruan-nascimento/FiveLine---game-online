-- CASE expressions need explicit enum values in PostgreSQL assignments.
create or replace function public.submit_game_move(p_game_id uuid, p_row smallint, p_col smallint) returns jsonb language plpgsql security definer set search_path = public as $$
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
  if jsonb_array_length(v_line) > 0 then
    v_result := case when v_piece = 1 then 'black_win' else 'white_win' end;
    v_reason := 'five_in_row';
  elsif v_game.move_count + 1 = 225 then
    v_result := 'draw';
    v_reason := 'board_full';
  end if;
  insert into public.game_moves (game_id, player_id, move_number, row, col, piece) values (p_game_id, v_user, v_game.move_count + 1, p_row, p_col, v_piece);
  update public.games set
    board = v_board,
    move_count = v_game.move_count + 1,
    last_move_row = p_row,
    last_move_col = p_col,
    winning_line = v_line,
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
