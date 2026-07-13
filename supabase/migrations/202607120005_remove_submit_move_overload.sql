-- The PostgREST RPC endpoint must expose exactly one function signature.
-- Keep the canonical smallint version used by the game schema.
drop function if exists public.submit_game_move(uuid, integer, integer);
notify pgrst, 'reload schema';
