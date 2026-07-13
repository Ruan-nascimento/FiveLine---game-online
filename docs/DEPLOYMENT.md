# Deploy

## Checklist de produção

1. Crie Supabase de produção e aplique `supabase db push`.
2. Habilite e-mail/senha e configure URLs de Site e Redirect para o domínio de produção.
3. Adicione `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_APP_URL` no provedor do frontend.
4. Configure um cron seguro com `service_role` para executar `expire_old_rooms` periodicamente. A Service Role nunca vai para Vercel como variável pública nem para o navegador.
5. Configure CORS/realtime no projeto Supabase para o domínio publicado.
6. Rode `npm run lint`, `npm run test` e `npm run build` no CI antes de publicar.
7. Faça teste manual com duas contas: sala, busca rápida, jogada inválida, reconexão, desistência e revanche.

## Vercel

Importe o repositório, defina as variáveis públicas no ambiente correto e use a configuração padrão de Next.js. Não é necessário expor chaves administrativas. Migrações devem ser aplicadas no pipeline de banco antes ou junto ao deploy do frontend.
