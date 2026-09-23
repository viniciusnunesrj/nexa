# Star System V1.1 — fragmentos

Regra vigente: ★1→★2 custa 25 fragmentos + 100 NEX; ★2→★3, 50 + 250;
★3→★4, 75 + 500; ★4→★5, 100 + 1000. Fragmentos do template da principal,
descontadas as reservas do marketplace. Nenhuma carta é consumida. Craft permanece em 100.

Migration complementar local: `20260923005141_star_system_v1_1_fragments.sql`.
Aplicada somente no NEXA `udnphyrtmlszcznamepd`, registrada como
`20260923005449_star_system_v1_1_fragments`. A migration V1 original não foi alterada ou reaplicada.
Os timestamps locais de V1/V1.1 diferem dos registros remotos: estes arquivos documentam
instalações já realizadas. Não usar db push nem executá-los automaticamente em ordem de nome;
num banco novo, V1 precisa preceder V1.1.

A assinatura RPC V1 permanece compatível; o cliente envia `p_material_ids: []`.
Payload antigo com materiais só pode consultar um recibo V1 já existente. Nova operação
com cartas materiais é rejeitada. Receipts registram template e fragmentos gastos no resultado JSON.
Locks de Star, fragmentos, perfil e carta preservam atomicidade e exclusão mútua.

Verificação V1.1: 14 testes locais passaram, incluindo renderização da Síntese, quatro custos,
mesmo template, reservas, insuficiências, idempotência e rollback após falha tardia.
Smoke remoto autenticado passou; `star-system-v1-1-smoke.sql` terminou com ROLLBACK.
Somente dados sintéticos; nenhuma carta ou saldo da conta Vinny foi utilizado.
Os testes históricos de V1 abaixo não devem ser executados contra V1.1.

## Histórico V1 (regra de materiais substituída pela V1.1 acima)

Aplicação autorizada concluída no projeto NEXA `udnphyrtmlszcznamepd`. A ferramenta registrou
`20260922235803_star_system_v1`, usando o conteúdo de `20260923010000_star_system_v1.sql`.
Não reaplicar pelo nome/timestamp local: o histórico remoto usa a versão gerada pela ferramenta.
Resultados e limitações da instalação: [star-system-supabase-validation.md](star-system-supabase-validation.md).

RPC dedicada: `public.execute_star_upgrade_v1(p_request_id text, p_main_card_id text, p_material_ids text[])`.
Migration: `supabase/migrations/20260923010000_star_system_v1.sql`.

## Objetos e comportamento

- Adiciona `user_cards.star_level smallint NOT NULL DEFAULT 1`, com check de 1 a 5. Instâncias existentes passam a ser ★1; novos INSERTs legados continuam usando o default. Não modifica templates.
- Cria schema `star_system_private`, tabela `operations`, PK `(owner_id,request_id)`, checks e FK de owner para profiles. A tabela tem RLS e nenhum acesso direto de anon/authenticated.
- Cria trigger `user_cards.star_level_v1`, função privada `protect_star_level_v1()` INVOKER, helper privado `execute_upgrade(text,text,text[])` DEFINER e wrapper público INVOKER. Todos usam `search_path=''`; apenas authenticated recebe EXECUTE da operação, com autenticação/ownership também dentro do helper. Não configurar o schema privado como exposto no PostgREST.
- A instalação não debita saldo nem consome cartas. Cada chamada posterior válida debita somente NEX, exclui materiais, incrementa só `star_level`/`updated_at` da principal e registra transação `STAR_UPGRADE` e recibo. Qualquer erro reverte a chamada inteira. NXA, XP, level e atributos originais permanecem intactos.
- Custos/quantidades no servidor: 1→2: 1/100; 2→3: 2/250; 3→4: 3/500; 4→5: 4/1000. ★5 não evolui.
- Todas as cartas: mesmo owner autenticado, FREE/FREE/IDLE, tradeable/synthesizable, sem timestamps de síntese, sem listing ativo/reserva. Materiais são instâncias distintas, ★1, mesmo template da principal. Propostas de troca pendentes são intenções, não reservas, conforme arquitetura atual; a aceitação da troca revalida posse/existência.
- Advisory lock por usuário + profile lock + locks de cartas ordenados com NOWAIT. Não espera em ciclos com marketplace/caixas/síntese. Contenção gera erro transitório e o cliente reutiliza o mesmo pedido. Quantidade é derivada do nível atual, não de dados do cliente.
- `request_id` ASCII `[A-Za-z0-9_-]{1,100}`, sem trim. Materiais são ordenados no servidor; mudar apenas a ordem não muda o pedido. Replay ocorre antes de consultar materiais já consumidos. Outro payload com mesma chave é rejeitado; usuários diferentes têm chaves independentes.
- Interface seleciona explicitamente materiais, mostra custo/saldo/resultado e atualiza inventário sem reload. Retry guarda o mesmo payload enquanto a resposta é incerta. Replay não restaura saldo/snapshot histórico: o contexto busca os valores atuais. Não usa `executeFusion`.

## Compatibilidade e limites conhecidos

1. `fragment_craft_operations_v1.card_id` tem FK restritiva para `user_cards`. Materiais com esse vínculo são recusados, sem cobrança. Podem ser principais. Não alteramos essa FK nem apagamos o histórico para contorná-la. O frontend não conhece esse vínculo e poderá oferecer uma carta que o servidor recusará. Suporte completo a esse grupo exige uma mudança separada no histórico de fabricação.
2. Os snapshots legados de marketplace/trocas não incluem estrelas. Inventário atualizado por `select('*')` recebe `starLevel`; snapshots antigos podem mostrar ★1. Nenhuma RPC legada foi alterada para ampliar esses snapshots.
3. Síntese/fusão mantém integralmente suas regras: estrelas não conferem atributos/recompensas nem proteção contra consumo por esses fluxos. A nova Ascensão aceita somente materiais ★1.
4. FKs existentes continuam valendo. Consumir uma carta usada como líder pode ativar o `ON DELETE SET NULL` já existente; arrays legados de formação seguem a validação dos fluxos atuais. Nenhuma preferência de batalha é escrita pela RPC.
5. Migration requer postgres/BYPASSRLS, user_cards com RLS e sem FORCE RLS, guards existentes de identidade, síntese, marketplace e perfil, e policy `synthesis_no_client_mint`. Falha atomicamente se faltarem. `docs/star-system-preflight.sql` lista tipos, FKs, constraints, permissões, guards e colisões. Esses requisitos foram verificados no projeto real antes da aplicação autorizada.
6. Adicionar a coluna exige lock de DDL: timeout local de 5s evita espera prolongada. Se falhar, repetir a migration inteira em momento adequado; não usar aplicação de todas as migrations pendentes.
7. Recibos são permanentes para preservar idempotência, um por upgrade concluído. Não há endpoint público de listagem nem geração de recibos para falhas.

## Testes locais

`node --test scripts/test-star-system.cjs` usa PGlite 0.5.8 instalado apenas em diretório temporário, sem mudar package.json/lockfile. Alternativamente definir `NEXA_PGLITE_PATH` para o pacote. O banco é em memória, com perfis/cartas sintéticos, tabelas base extraídas do schema local e guards reais de identidade, síntese, perfil e marketplace. O arquivo exato da migration é executado nesse banco descartável.

Cobertura: quatro upgrades, máximo, saldo, template, estrelas dos materiais, ownership, IDs repetidos/main, quantidade, estados, listing/reserva, FK de fabricação, autenticação, permissões, edição direta de estrelas, replay/payload diferente, double-submit enfileirado e rollback de erro provocado no ledger depois do débito/consumo.

PGlite usa uma conexão: double-submit enfileirado **não demonstra contenção entre sessões independentes**. Após autorização e pré-validação, verificar concorrência em duas conexões com fixtures sintéticas e rollback, além de chamada autenticada via PostgREST. Não usar cartas/saldos reais para esses testes. Testes locais não certificam o schema remoto nem a configuração do PostgREST.

## Procedimento de instalação (executado após autorização)

Revisar os SELECTs de pré-validação; aplicar somente `star_system_v1` com o conteúdo exato da migration, nunca `db push` indiscriminado. Verificar grants/RLS/definições e testar com fixtures sintéticas após aplicação autorizada. Sem commit, push, merge ou deploy nesta etapa.

Referência de segurança de funções: https://supabase.com/docs/guides/database/functions

## Histórico da verificação local anterior à autorização remota

- Star System: 31 testes passaram, incluindo o handler real de contexto com RPC pendente, double-submit, refresh após confirmação, replay sem restaurar saldo antigo e troca de sessão.
- TypeScript (`npm run lint`): passou.
- Build (`npm run build`): passou; permanece o aviso de bundle acima de 500 kB.
- RiftBattle V2: 14 testes passaram. Trocas V2 e Síntese: scripts de regressão passaram.
- Marketplace: verificações estáticas passaram, mas o script existente falha no mock por não reconhecer `./cardFragmentService`. Esse serviço e esse teste não foram alterados pela Ascensão; falha fora deste escopo.
- Nenhuma consulta/migration remota, uso de cartas reais, commit, push, merge ou deploy.

Arquivos desta implementação: a migration acima; `src/features/star-system/rules.ts`; `src/services/starUpgradeService.ts`;
`src/contexts/GameStateContext.tsx`; `src/lib/supabaseMappers.ts`; `src/pages/Fusion.tsx`; `src/types/economy.ts`;
`scripts/test-star-system.cjs`; `docs/star-system-preflight.sql`; este documento.
O `Card.starLevel` e a apresentação de estrelas em AssetCard já existiam e foram preservados.
