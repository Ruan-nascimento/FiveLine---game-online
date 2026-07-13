# Arquitetura

## Frontend

Next.js App Router organiza as rotas públicas, de autenticação e de partidas. `GomokuBoard` é um componente de apresentação acessível e reutilizável; ele não importa Supabase, IA nem regras de multiplayer. O estado do modo IA fica em `useAIGame`.

## Motor e IA

`features/game/engine` contém funções puras para criar tabuleiro, validar/aplicar movimento, detectar vitória e empate. O modo IA chama a mesma implementação. A IA é executada em `ai.worker.ts`, com fallback síncrono válido se o Worker falhar.

## Autenticação e Supabase

`lib/supabase/client.ts` cria uma única instância de browser apenas quando as variáveis públicas existem. `proxy.ts` renova sessão e protege rotas online, perfil e histórico quando Supabase está configurado. O login e cadastro usam Supabase Auth; o gatilho `handle_new_user` cria o perfil e valida username no banco.

## Multiplayer

O cliente chama RPCs protegidas para criar/entrar em sala, entrar/sair da fila, submeter movimento, desistir e pedir revanche. `submit_game_move` bloqueia a linha de `games` com `FOR UPDATE`, altera tabuleiro, insere o movimento e determina o estado final na mesma transação. Realtime apenas acelera a UI; em reconexão ou rejeição, o cliente relê a linha persistida de `games`.

## Fonte de verdade e reconexão

`games.board`, `games.current_player`, `games.status` e `game_moves` são a fonte de verdade. O cliente envia intenção, não estado derivado. A página online mantém heartbeat, reage ao canal Realtime e desabilita a interação offline. Após dois minutos sem heartbeat, o adversário pode acionar a função de abandono; esse período é decidido no servidor.
