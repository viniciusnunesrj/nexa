# Star System V1 — validação no Supabase NEXA

**Conclusão: APROVADO PARA TESTE FRONTEND.** Não representa homologação completa de concorrência nem auditoria global dos sistemas antigos.

## Aplicação

- Projeto confirmado pela API: **Nexa**, `udnphyrtmlszcznamepd`, PostgreSQL 17.6, `READ COMMITTED`, postgres/BYPASSRLS.
- Somente a migration `star_system_v1` foi aplicada, com sucesso. Nenhuma outra migration pendente foi executada.
- Arquivo: `supabase/migrations/20260923010000_star_system_v1.sql`, sem correções de implementação nesta etapa.
- SHA-256 do arquivo aplicado: `43C29A8F7F923CB1E0DA7ED884055C13DBF33D147F066B89DA8F43D2B8763130`.
- A ferramenta Supabase gerou a versão remota **20260922235803**, nome **star_system_v1**. O timestamp remoto difere do nome do arquivo local. Evitar `db push` automático/reaplicação; conciliar o histórico antes de qualquer fluxo futuro em lote.
- Sem commit, push, merge ou deploy.

## Pré-validação somente leitura

Executados os SELECTs de `star-system-preflight.sql`, individualmente para não perder resultados no conector, e consultas complementares de catálogo/definições/hashes.

- Todas as 29 colunas exigidas nas seis relações existem com os tipos esperados. A estrutura completa de `user_cards` também foi inspecionada.
- `user_cards` e demais relações usadas pertencem a postgres, com RLS ativo e sem FORCE RLS. anon/authenticated não têm BYPASSRLS/superuser.
- `profiles.balance_nex` é numeric NOT NULL, com check >=0. A RPC de fusão atual confirma o padrão autoritativo: lock do perfil, UPDATE pelo DEFINER e registro em transactions. Star usa esse mesmo saldo, sem NXA.
- Os cinco guards exigidos estão ativos e suas definições foram conferidas: identidade de template, campos de síntese, reservas de cartas, listings e proteção econômica do perfil. A policy restritiva `synthesis_no_client_mint` está instalada.
- Não havia `star_level`, schema privado, RPC, trigger ou constraint com os nomes novos.
- PKs de profiles/user_cards e constraints de transactions são compatíveis; `STAR_UPGRADE` não conflita com enum/check de tipo.
- A FK `fragment_craft_operations_v1_card_id_fkey` é restritiva e foi preservada. Materiais vinculados à fabricação falham antes de débito/consumo.
- A FK de líder de batalha continua `ON DELETE SET NULL`; reservas têm FK restritiva. Nenhuma FK foi modificada.
- Trade V2 usa profiles → intenção de escrita na tabela → cartas ordenadas, com NOWAIT; o Star adota a mesma estratégia. Síntese usa lock da carta; NOWAIT no Star evita espera cíclica. A função de fusão existente usa locks bloqueantes e foi preservada.
- Propostas de trade PENDING **não reservam cartas** na arquitetura existente. Não foram transformadas em bloqueios novos. A aceitação revalida ownership, existência e disponibilidade. Estados não FREE/FREE/IDLE e reservas reais são recusados pelo Star.
- Histórico remoto contém todas as dependências necessárias e migrations adicionais de Duelo/segurança não representadas integralmente no diretório local. Não houve tentativa de sincronizar/aplicar essas migrations.
- Ajuste documental do preflight: a consulta opcional de baseline agora referencia `open_box_v2`, nome real instalado, e inclui `trade_operation_v2`. O baseline efetivamente usado cobriu **todas as 74 funções existentes** em public/riftbattle_v2_private.

## Validação após aplicação

- Coluna `smallint NOT NULL DEFAULT 1`, constraint 1–5 confirmada. **19/19 cartas existentes em ★1**.
- Wrapper `public.execute_star_upgrade_v1`: SECURITY INVOKER; helper privado: SECURITY DEFINER; guard: SECURITY INVOKER. Todos postgres e `search_path=''`.
- authenticated pode chamar a operação; anon não. Nenhum acesso direto SELECT/INSERT/UPDATE/DELETE dos clientes aos recibos. RLS dos recibos habilitado.
- GET somente leitura com chave pública já configurada, `Accept-Profile: star_system_private`, retornou **HTTP 406 / PGRST106 / Invalid schema**. Schema privado **não exposto** pelo PostgREST. Nenhuma configuração alterada.

## Testes funcionais

`docs/star-system-rollback-tests.sql` foi validado primeiro no PostgreSQL embarcado e depois executado no banco real, sempre encerrando em **ROLLBACK**.

**40 checks passaram**, cobrindo default; quatro upgrades/custos/quantidades; retries; rollback de débito, consumo, estrelas e ledger após erro forçado no bloco transacional; máximo ★5; saldo; template; material ★2; ownership da principal e material; principal como material; duplicatas; quantidade; ACTIVE/SYNTHESIZING/EQUIPPED/FROZEN; flags tradeable/synthesizable; timestamps de síntese; listing; reservation; vínculo de fabricação; request inválido; ausência de auth.uid; payload diferente com mesma chave; mesma chave entre usuários diferentes; edição direta das estrelas; leitura privada; anon; constraints 0 e 6.

Foram criados temporariamente **2 perfis sintéticos, 7 cartas sintéticas e 6 recibos de upgrades**, com seus débitos/ledgers sintéticos. Os casos usam subtransações para recuperar as fixtures, e a transação externa foi revertida. A consulta final confirmou **zero perfis/cartas de teste, zero recibos Star e zero transações STAR_UPGRADE persistentes**.

As chamadas de teste usaram `SET LOCAL ROLE authenticated` com claims sintéticos para `auth.uid()`. Isso valida autorização no PostgreSQL, **não substitui um login JWT e um clique real no frontend**. Nenhuma credencial de usuário foi usada.

Teste local atualizado: **32 testes passaram**, incluindo execução prévia do mesmo roteiro remoto. O teste local de falha dentro da escrita de ledger também continua passando. TypeScript/build da implementação já haviam passado; nesta etapa mudaram apenas scripts/documentação, não código de produção.

## Concorrência

Tentativa com dois backends distintos (PIDs 1453338 e 1453356), advisory lock de usuário fictício sem perfil/cartas e rollback. Apesar do disparo paralelo, o conector não produziu sobreposição: o segundo recebeu `Perfil não encontrado`, não `55P03`. **Contenção real não comprovada**. Não criamos serviços/extensões ou alterações arriscadas para forçar esse teste. Double-submit local e replay remoto passaram; disputa entre duas sessões simultâneas permanece pendente.

## Integridade preservada

Comparação antes/depois: **19/19 tabelas com contagens e hashes idênticos**, desconsiderando exclusivamente a coluna nova `star_level` ao comparar o conteúdo anterior de user_cards. Inclui profiles (8), user_cards (19), transactions (127), battle_runs (677), battle_preferences, marketplace/listings/reservas/operações, trades/requests, fusion, fragment craft, fragments, boxes, rewards PVE/PVP, rooms, templates e validações RiftBattle.

Portanto nenhum saldo NEX/NXA, XP, level, reward, ownership ou carta real foi alterado pelos testes. Templates e dados dos sistemas anteriores permaneceram intactos.

**74/74 definições de funções anteriores idênticas**, sem funções ausentes. `start_battle_atomic(text)` permanece com MD5 `40db7985c60e33be592244369c8c0a73`. Inclui Síntese, fusão, caixas, marketplace, trades e RiftBattle.

## Avisos e limitações

- Permanece a rejeição segura de materiais fabricados por fragmentos; frontend não conhece esse vínculo e pode receber essa rejeição.
- Snapshots legados de marketplace/trades ainda não carregam estrelas. A instância no inventário carrega o nível real; nenhuma RPC antiga foi alterada.
- Auditor Supabase retornou apenas INFO para Star: RLS sem policies nos recibos, intencional para negar acesso direto. [Explicação do aviso](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Há avisos fora do Star: RLS desabilitado em tabelas de referência de batalha/card_templates, search_path mutável em funções antigas, grants de funções DEFINER e proteção de senhas vazadas desabilitada. Não foram introduzidos nem corrigidos nesta etapa. [RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public), [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [grants](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Próximo passo: testar a aba ASCENSÃO no frontend local com uma conta de teste e inventário dedicado, validando seleção, confirmação, atualização sem reload e recuperação de conexão. Não consumir cartas reais da conta Vinny sem uma instrução específica.
