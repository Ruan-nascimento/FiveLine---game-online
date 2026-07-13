# Regras permanentes do projeto

- TypeScript permanece em modo estrito; não usar `any` sem justificativa documentada.
- O servidor é a autoridade para partidas online. Cliente nunca define turno, vencedor, tabuleiro final ou resultado.
- Não há monetização, ranking, Elo, temporadas, anúncios, chat livre ou recursos sociais neste MVP.
- Nenhum segredo, Service Role Key ou token privado pode entrar no código, no Git ou no cliente.
- O motor do jogo é puro e imutável; regras não devem ser duplicadas em componentes.
- Toda entrada externa deve ser validada. RPCs críticas precisam de autorização, RLS e operação atômica.
- Não deixar botões falsos: recursos que dependem de Supabase devem explicar claramente quando o serviço não está configurado.
- Rodar lint, testes e build antes de concluir uma mudança e manter a documentação afetada atualizada.
