# Linha 5

MVP de Gomoku (Cinco em Linha) com modo público contra IA e multiplayer casual protegido por Supabase. A prioridade é uma partida rápida e clara: tabuleiro 15 × 15, vitória com cinco ou mais peças contínuas e interface responsiva.

## Tecnologias

- Next.js 16, React 19, TypeScript estrito e Tailwind CSS 4
- Motor puro de Gomoku e IA heurística/Negamax em Web Worker
- Supabase Auth, PostgreSQL, Realtime e Row Level Security
- Zod, Vitest, React Testing Library e Playwright

## Requisitos

- Node.js 22+ e npm 11+
- Um projeto Supabase para autenticação e multiplayer
- Supabase CLI (recomendado para aplicar migrations localmente)

## Instalação e execução local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`. O modo contra IA funciona sem variáveis de ambiente. Preencha `.env.local` para habilitar cadastro e partidas online:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-sb_publishable-ou-anon-publica
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SECRET_KEY=sua-chave-sb_secret-apenas-no-servidor
```

Nunca use `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` no navegador ou neste arquivo de exemplo. A chave `sb_publishable_...` é a chave correta para `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Em **Authentication > Providers**, habilite e-mail/senha e configure a URL de redirecionamento local e de produção (`/entrar`).
3. Copie a URL e a chave anônima pública para `.env.local`.
4. Vincule o projeto à CLI e aplique a migration:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Ou, em ambiente local:

```bash
supabase start
supabase db reset
```

A migration cria tabelas, índices, gatilho de perfil, funções RPC, RLS e publicação Realtime para `games`.

## Testes, lint e build

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

`test:e2e` exige que os navegadores do Playwright estejam instalados (`npx playwright install`). Os fluxos online exigem um Supabase local ou de teste configurado; eles não usam dados simulados.

## Estrutura principal

```text
src/
  app/                    rotas App Router
  components/game/        tabuleiro e tela da partida IA
  components/multiplayer/ salas, fila e partida online
  features/game/engine/   regras puras e testadas
  features/game/ai/       candidatos, avaliação, Negamax e Worker
  lib/supabase/           clientes browser e servidor
  lib/validations/        contratos Zod
supabase/migrations/      schema, RLS e RPCs transacionais
docs/                     arquitetura, IA, banco e deploy
```

## Multiplayer local com duas pessoas

1. Inicie o Supabase local e aplique a migration.
2. Inicie `npm run dev`.
3. Use duas janelas anônimas, crie duas contas com usernames diferentes e confirme e-mails caso a configuração local exija.
4. Uma pessoa cria uma sala em `/multiplayer/criar`; a outra abre o link copiado ou informa o código em `/multiplayer/entrar`.
5. Alternativamente, ambas acessam `/multiplayer/buscar` para testar a fila.

O banco é a fonte de verdade: a interface envia apenas `{ gameId, row, col }`; a RPC valida participante, turno, status, posição, vitória e empate na mesma transação.

## Deploy

O frontend é compatível com Vercel. Adicione as três variáveis públicas acima no ambiente de produção, atualize as URLs de Auth no Supabase e aplique as migrations antes do deploy. Consulte [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Limitações conhecidas

- O repositório não inclui credenciais nem um projeto Supabase; por isso os fluxos externos precisam ser verificados após configuração pelo responsável pelo ambiente.
- A recuperação de senha envia o e-mail pelo Supabase; a tela de definição de nova senha depende da configuração de redirect e template do projeto.
- Os sons são uma preferência de interface preparada no setup, mas não há arquivos de áudio distribuídos neste MVP para evitar incluir ativos sem licença.
- O replay completo ainda mostra o tabuleiro final pela partida; a lista de movimentos está persistida e protegida, mas não há controle de avanço/retrocesso na UI nesta versão.

Consulte [RULES.md](RULES.md) e [INITIALIZATION_RULES.md](INITIALIZATION_RULES.md) antes de alterar o projeto.
