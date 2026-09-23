# RiftBattle V2 — fundação de validação, 22/09/2026

Implementado somente na worktree atual, branch `riftbattle-v2`. Pronto para iniciar testes em banco isolado; não é ainda combate autoritativo nem liberação para produção. Nenhum SQL foi executado.

## Leitura e estado inicial

Arquivos inspecionados (leitura integral dos módulos V2; trechos pertinentes dos arquivos grandes):

- `src/pages/RiftBattleV2.tsx`;
- `src/features/riftbattle-v2/{arenaConfig,types,rules,cardCatalog,battleEngine,ai,inventoryAdapter}.ts`;
- `src/contexts/GameStateContext.tsx`, `src/services/supabaseService.ts`;
- `src/lib/supabase.ts`, `src/lib/supabaseMappers.ts`, `src/App.tsx` (diff);
- `supabase/schema.sql` (schema de inventário e diff preexistente);
- migrations `20260912214500_secure_character_battle_persistence`, `20260912223000_card_formation_leader`, `20260912230000_server_battle_runs`, `20260912233000_server_battle_stats_v2`, `20260913010000_adaptive_pve_matchmaking`, `20260915010000_card_marketplace_v2`, `20260919010000_trade_offers_v2`, `20260921020000_rebalance_arena_rewards_v1`, `20260921203008_authoritative_nexus_duel_pve`, `20260922020000_fix_fusion_card_availability_v2`;
- `package.json`, `tsconfig.json`, `vite.config.ts`, `.env.example`.

Antes de qualquer edição havia mudanças rastreadas em App, RarityBadge, battleEngine, cardCatalog, rules, types, Fusion, Login, authService e schema.sql. A página V2 e ai/arenaConfig/inventoryAdapter já existiam como arquivos não rastreados, além de outros arquivos alheios ao escopo. Nada disso foi limpo, revertido, adicionado ao index ou sobrescrito em bloco.

A comparação SHA-256 da implementação inicial confirmou que somente `src/pages/RiftBattleV2.tsx` foi alterado entre os arquivos então preexistentes de src/supabase. Na etapa posterior de hardening foram ajustados também inventoryAdapter.ts, serverValidation.ts e a migration V2 ainda não executada. As mudanças alheias ao V2 continuam preservadas. O build atualiza os artefatos locais de `dist`.

## Arquitetura encontrada

| Arena | Cartas por time | Limite ativo | Habilidades | Energia por rodada, saturando no último valor |
|---|---:|---:|---|---|
| rift-standard | 4 | 2 | Sim | 3, 4, 5, 6 |
| rift-pure | 4 | 2 | Não | 3, 4, 5, 6 |
| rift-expansion | 6 | 3 | Sim | 4, 5, 6, 7 |
| rift-war | 8 | 4 | Sim | 5, 6, 7, 8 |

1. `RiftBattleState` mantém arena, rodada, fase, jogador atual, prioridade, dois jogadores, cartas/energia e resultado opcional. Cada instância tem HP atual, estado RESERVE/ACTIVE/DEFEATED e flags de entrada, ação, escudo, barreira, reparo, recarga e marca.
2. O engine copia o estado antes de aplicar DEPLOY_CARD, ATTACK, USE_ABILITY ou END_TURN. A partida começa com TODAS as cartas na reserva; activeSlots é um limite, não deploy automático. O texto de formação existente não descreve isso com precisão e foi preservado.
3. Deploy exige reserva, espaço ativo e energia; desconta deployCost. Carta recém-colocada aguarda o próximo turno, salvo INVESTIDA. Custos 4–5 recebem barreira de entrada mesmo na arena Puro, comportamento existente preservado.
4. Ataque básico não gasta energia: dano = max(1, ATK − floor(DEF/2)). Escudo reduz 1 uma vez, barreira reduz 2 uma vez, outra unidade com PROTECAO reduz 1. O dano mínimo é 1; MARCA soma 1 depois desse limite e é consumida. HP zero derrota a instância.
5. Habilidades ativas custam 1 energia e consomem a ação: BARREIRA protege; REPARO cura 2 uma vez; RUPTURA ignora defesa base, mantendo mitigadores; SOBRECARGA soma 2 ao ataque; MARCA prepara dano adicional; IMPULSO grava priorityCardId. RECARGA recupera 1 no deploy, limitada pela energia máxima. Habilidades estão condicionadas à arena.
6. END_TURN alterna os jogadores; a rodada aumenta ao retornar ao PLAYER_ONE. Energia do próximo jogador é recarregada ao máximo da rodada, sem acumulação. Flags de ação/entrada e barreira das cartas ativas desse jogador são reiniciadas.
7. Vitória exige derrotar todas as cartas adversárias, incluindo reservas que ainda serão colocadas em campo. Não existe resolução antecipada ou recompensa no engine V2. A prioridade é registrada, mas não impõe uma ordem de ações no engine; SPD tampouco determina a ordem dos ataques. Não alteramos essas regras.
8. IA escolhe ações localmente. RECRUTA usa uma estratégia simples; OPERADOR e NEXUS percorrem o mesmo ramo atual de reparo, habilidades, ataques e deploy. A página agenda ações e limita a sequência por turno. Oponente é escolhido localmente por pontuação HP + 2×ATK + 2×DEF + custo, evitando templates do jogador.
9. GameState fornece assets do usuário; inventoryAdapter exige state=FREE, cardStatus=FREE, status=IDLE, template V2 e ausência dos três timestamps conhecidos de síntese/acúmulo/exaustão. `id` e `sourceInstanceId` preservam a instância real de user_cards; `templateId` aponta para o catálogo/imagem. Distintas cópias do mesmo template permanecem separadas. Os mappers antigos ainda têm defaults permissivos; reservas do marketplace, atividade oficial do template e mudanças posteriores ao carregamento continuam dependendo da validação server-side.

### Fluxo antigo e economia

`GameStateContext.executeBattle(requestId)` chama `SupabaseService.startBattleAtomic`, que chama `start_battle_atomic(p_request_id)`. Online, erros são propagados; o fallback offline antigo tem seu próprio fluxo econômico. Nenhum desses caminhos foi reutilizado no V2.

O RPC antigo autentica com auth.uid(), serializa por usuário com advisory lock, lê preferências de formação sob lock, valida instâncias/templates e simula até 50 rodadas com stats e fórmulas antigos. `battle_runs` tem unicidade `(owner_id, request_id)`. Uma repetição só retorna o resultado persistido quando a execução está COMPLETED e reward_applied=true. A versão mais recente encontrada não mantém locks individuais nas cartas durante toda a simulação.

`20260921020000_rebalance_arena_rewards_v1.sql` chama `apply_battle_reward_for_run` ao final: vitória 100 XP/30 NEX/2 NXA, derrota 30 XP/8 NEX/0 NXA, empate 50 XP/12 NEX/0 NXA. O helper definido em `20260912230000_server_battle_runs.sql` bloqueia profiles, atualiza balance_nex, balance_nxa, experience, level, max_experience e contadores, e marca battle_runs.reward_applied=true. O Nexus Duel tem outro fluxo próprio de recompensa. Tudo foi preservado.

## Implementação nova

- Nova migration `supabase/migrations/20260922215435_riftbattle_v2_validation.sql`.
- Novo contrato `src/features/riftbattle-v2/serverValidation.ts`.
- Novo serviço `src/services/riftBattleV2Service.ts`.
- Integração opt-in e correção TypeScript pontual em `src/pages/RiftBattleV2.tsx`.
- Testes offline `scripts/test-riftbattle-v2-validation.cjs` e este documento.
- Pré-validação manual `docs/riftbattle-v2-preflight.sql`, composta exclusivamente de SELECTs não executados.
- Hardening no adapter existente `src/features/riftbattle-v2/inventoryAdapter.ts`.

RPC público: `validate_riftbattle_v2_squad(p_request_id text, p_arena_id text, p_rules_version text, p_instance_ids text[]) → jsonb`.

Versão: `riftbattle-v2-preview-20260922.1`. Aceita somente identificadores, arena e versão. Não aceita usuário, templates, stats, resultado ou recompensa fornecidos pelo cliente. A ordem do array faz parte do payload idempotente.

request_id tem a mesma gramática ASCII no SQL e TypeScript: 1–200 caracteres, primeiro caractere alfanumérico, demais caracteres alfanuméricos ou `.`, `_`, `:`, `-`. Nenhum trim/conversão é aplicado: identificadores fora da gramática são rejeitados, incluindo espaços, tabs, quebras de linha e Unicode. UUIDs gerados pela tela continuam válidos. A alteração não muda o snapshot nem o balanceamento; foi incorporada à migration ainda não executada.

Retorno: success, validation_id, request_id, rules_version, arena completa, cards com IDs reais/templateId/sourceInstanceId e atributos V2, validated_at, idempotent, mode=VALIDATION_ONLY, authoritative=false, reward_applied=false. Não retorna um resultado de combate.

O schema não exposto `riftbattle_v2_private` guarda `rules` e `validations`. O snapshot congelado contém as quatro arenas e os 60 templates extraídos dos módulos atuais; não copia atributos econômicos de card_templates. O catálogo antigo só confirma existência/atividade do template. Cada mudança futura de regras deve ganhar outra versão e migration, preservando recibos antigos.

O wrapper público usa SECURITY INVOKER; o helper privado usa SECURITY DEFINER com search_path vazio e nomes qualificados. Authenticated recebe somente USAGE no schema e EXECUTE nas funções necessárias. PUBLIC/anon não recebem execução; tabelas têm RLS habilitada e nenhum acesso direto para clientes. Não adicione esse schema à lista de schemas expostos da Data API. Referência consultada: [Supabase — Database Functions](https://supabase.com/docs/guides/database/functions).

Validações escritas no servidor:

- auth.uid() obrigatório e owner_id comparado em TODAS as instâncias;
- arena e versão existentes, cardinalidade exata, array unidimensional, IDs não vazios e sem espaços periféricos;
- rejeição da mesma instância repetida; cópias distintas do mesmo template permitidas;
- template oficial ativo e presente no catálogo V2;
- state=FREE, card_status=FREE, status=IDLE; ausência de timestamps de síntese/acúmulo/exaustão e de reserva/listagem ativa no marketplace;
- leitura de ownership, estados, templates e reservas em uma única instrução SELECT com snapshot MVCC; nenhum lock de linha é tomado nas cartas;
- advisory lock V2 por usuário sem espera e UNIQUE(owner_id, request_id); mesmo request com payload diferente é rejeitado; se houver requisição simultânea em andamento, retornar 55P03 e repetir o mesmo request;
- limites por usuário de 30 novos recibos/minuto, 500/24h e 10000 totais no preview. Replay idempotente ocorre ANTES das quotas. Um índice `(owner_id, created_at DESC)` suporta a contagem; a seção crítica serializa contagem e inserção no isolamento padrão READ COMMITTED do RPC;
- persistência somente em tabelas novas; reward_applied é protegido por CHECK que só permite false.

O único advisory lock é V2 por usuário e dura somente a transação; não bloqueia linhas do inventário. Leituras normais ainda usam os locks de tabela usuais de SELECT, compatíveis com DML, mas sujeitos a DDL concorrente. O recibo é histórico: repetir request_id retorna o snapshot original, inclusive se a carta posteriormente for transferida. Uma transferência também pode concluir entre a leitura e a resposta. Isso é correto para validation-only: não representa autorização atual, reserva persistente, partida concluída ou direito a prêmio. Uma nova partida utiliza novo request_id. Não há chamada ao helper antigo de recompensa, UPDATE de inventário/perfil nem gravação em battle_runs.

As quotas limitam recibos criados, não todo tráfego HTTP ou tentativas inválidas. Não removemos recibos para liberar espaço: isso descartaria chaves de idempotência. Ao atingir 10000, novos recibos ficam bloqueados até decisão administrativa futura; retries antigos continuam funcionando. O limite é por usuário, não global, e não pretende substituir a proteção geral de tráfego do projeto. O RPC fica acessível a authenticated após aplicar a migration, independentemente da flag frontend.

### Integração da tela

`VITE_RIFTBATTLE_V2_SERVER_VALIDATION=true` habilita a validação no início/reinício. Ausente ou false preserva o modo local. Nenhuma variável de ambiente existente foi modificada. Habilitar apenas no ambiente de teste que recebeu a migration.

No modo habilitado, a tela usa o snapshot V2 devolvido pelo servidor para inicializar as cartas do jogador. Erro de RPC/versão/configuração impede o início, sem fallback silencioso. Clique repetido não envia chamadas concorrentes; retry de resposta incerta mantém request_id/payload; nova partida bem-sucedida ou retorno à seleção reinicia o identificador. Mensagem de erro e estado de carregamento usam o layout existente.

Combate, ações, energia, IA, seleção do oponente, dificuldade, animações e vitória/derrota permanecem client-side. Nenhum resultado local é enviado como verdade ao servidor.

### Próxima etapa autoritativa

As escolhas de deploy, alvo, habilidade e fim de turno alteram o resultado. Um RPC que recebesse apenas o time e resolvesse outra simulação não representaria essa partida. Evoluir com sessão persistida, snapshot/seed do oponente server-side, versão do estado, sequência/idempotência de ações e executor do engine V2 no servidor (por exemplo, Edge Function com o mesmo módulo puro). Cada ação deve autenticar ownership da sessão, verificar revisão esperada, validar a transição e persistir estado/eventos atomicamente. Alternativamente, replay integral exige log de ações validado, estado inicial e oponente determinados no servidor; nunca aceitar resultado informado pelo cliente. A política de reserva de inventário durante a sessão é decisão futura explícita. Recompensas continuam fora desse escopo.

## Verificações realizadas

- Antes das mudanças, `npm run lint` falhou com TS2339 em RiftBattleV2.tsx:1013 (player.cards sobre unknown). Corrigido usando os dois jogadores tipados explicitamente; sem alteração visual ou de regras.
- `npm run lint` final: passou.
- `node --test scripts/test-riftbattle-v2-validation.cjs`: 14 testes, incluindo paridade total do snapshot, cardinalidade/IDs, cópias distintas, resposta incompatível, gramática ASCII/Unicode, elegibilidade/timestamps, guardas estáticos SQL/quotas, caráter SELECT-only do preflight, retry do serviço com RPC simulado e partidas completas nas quatro arenas.
- `npm run build`: passou antes e depois. A primeira tentativa restrita falhou por acesso negado aos diretórios superiores; repetição com acesso local aprovado resolveu. Aviso preexistente de chunks acima de 500 kB continua; não houve refatoração de bundle.
- `git diff --check`: passou. Hashes confirmam preservação dos demais arquivos preexistentes de src/supabase, inclusive economia, schema e migrations antigas.
- Não executamos testes de banco, parser PostgreSQL, RPC real ou teste visual de navegador. Os testes SQL são estáticos: não comprovam instalação, permissões efetivas, RLS ou concorrência no banco.
- CLI Supabase não estava disponível no PATH/cache consultado. Como instalação de dependências foi proibida, a nova migration foi criada localmente com timestamp UTC, sem CLI nem conexão com banco.
- Nenhum commit, push, merge, deploy, instalação de dependências, alteração de saldo/recompensa ou execução de migration/SQL.

## Roteiro para banco isolado e Preview da Vercel

Passos abaixo são pendentes, não foram executados e exigem autorização posterior para SQL/publicação.

1. Disponibilizar Supabase de teste com o schema real e migrations anteriores necessárias. Confirmar que public.user_cards, card_templates, marketplace_reservations_v2 e marketplace_listings existem. Revisar/aplicar SOMENTE a migration nova nesse ambiente. Não aplicar em produção para validar a hipótese.
2. Usar dois usuários e inventário fictício elegível. Verificar as quatro arenas; 4/4/6/8 instâncias; templates repetidos em IDs distintos; rejeitar IDs repetidos, de outro usuário, ausentes, nulos, vazios, quantidade errada, versão/arena inválida e template inativo/fora do catálogo.
3. Testar FREE/IDLE versus ACTIVE, LISTED, FROZEN, EQUIPPED, EXHAUSTED, card_status divergente, timestamps de síntese e reserva/listagem ativa. Confirmar rejeição mesmo que o cliente exiba a carta como elegível.
4. Testar sem JWT, anon e authenticated; leitura/escrita direta das tabelas deve falhar. Confirmar execução apenas para usuário autenticado e isolamento dos recibos entre usuários.
5. Repetir mesmo request/payload: mesmo validation_id, idempotent=true, uma única linha. Mudar arena/versão/IDs/ordem com o mesmo request deve falhar. Testar 30/31 recibos em um minuto, 500/501 em 24h e 10000/10001 totais, com fixtures isoladas e sem manipular dados reais. Replay deve continuar aceito após atingir quota; outra conta tem quota própria. Em concorrência, retry de 55P03 mantém payload/request. Validar que leituras do V2 não bloqueiam DML de marketplace/transferência. Transferir carta após um recibo: retry é histórico; NOVO request deve revalidar e falhar.
6. Comparar snapshots de profiles, user_cards, transactions e battle_runs antes/depois: nenhuma mudança. Verificar reward_applied=false nos recibos e nenhum caminho de recompensa acionado.
7. Configurar o Preview com URL/chave pública do Supabase DE TESTE e `VITE_RIFTBATTLE_V2_SERVER_VALIDATION=true`. Sem a migration, a opção deve permanecer desativada; ativada deve bloquear início caso o RPC não exista.
8. Repetir lint, testes e build; testar na interface iniciar/reiniciar, duplo clique, erro de rede/retry, erro de versão, troca de conta e as quatro arenas. Confirmar `/riftbattle-v2` e regressão básica da arena antiga, sem gerar economia real.
9. Só após autorização publicar um Preview Vercel da branch atual, sem merge em main e sem usar banco de produção. Se o processo exigir commit/push, também depende de autorização posterior. Este Preview continua identificado tecnicamente como simulação local com validação inicial, não combate autoritativo.

## Checklist exata antes da migration

Execute manualmente os blocos de [riftbattle-v2-preflight.sql](riftbattle-v2-preflight.sql), usando a mesma role administrativa que aplicará a migration. Nenhuma consulta desse arquivo foi executada nesta preparação. O último SELECT de histórico é opcional: só executar se a consulta anterior confirmar a relação e as colunas version/name.

| Relação | Colunas diretamente utilizadas e tipos esperados |
|---|---|
| public.user_cards | id, owner_id, template_id, state, card_status, status: text NOT NULL; synthesized_at, last_accrual_at, exhausted_at: timestamptz nullable |
| public.card_templates | template_id: text NOT NULL; active: boolean NOT NULL |
| public.marketplace_reservations_v2 | card_id: text NOT NULL |
| public.marketplace_listings | item_id, status: text NOT NULL |

- As quatro relações devem ser tabelas reais (`relkind=r`), como no DDL local. Tipos diferentes são divergência a investigar; não executar supondo equivalência.
- Unicidade de user_cards.id e card_templates.template_id é essencial para a cardinalidade do join. Ambas são PRIMARY KEY no schema local. Conferir constraints validadas; não basta comparar os nomes.
- Baseline complementar: marketplace_reservations_v2 tem PK(card_id), FK para user_cards(id), listing_id UNIQUE/FK para marketplace_listings(id); marketplace_listings tem PK(id). Essas FKs não são chamadas pelo novo RPC, mas confirmam a estrutura de marketplace esperada. Não adicionamos nem alteramos nenhuma delas.
- Checks locais: user_cards.state permite FREE/ACTIVE/EXHAUSTED; status permite IDLE/EQUIPPED/LISTED/FROZEN/ACTIVE/EXHAUSTED; marketplace_listings.status permite ACTIVE/SOLD/CANCELLED. card_status é text NOT NULL sem enum obrigatório no DDL base. O RPC verifica diretamente os estados permitidos mesmo se houver divergência nesses checks.
- Fontes locais: schema.sql define user_cards/listings; 20260912230000_server_battle_runs cria card_templates; 20260915010000_card_marketplace_v2 cria reservations; 20260915020000 revoga escrita legada do marketplace. As migrations posteriores de stats, síntese, troca e fusão consultadas não removem as colunas necessárias. Não dependemos dos stats econômicos acrescentados a card_templates.
- auth.uid() deve existir, retornar uuid e ser executável pelo owner do helper. pg_catalog.gen_random_uuid() deve existir/retornar uuid. PostgreSQL >=13; usar READ COMMITTED para as chamadas do RPC. O preflight mostra versão e isolamento; a configuração efetiva da API também deve ser confirmada.
- Roles anon/authenticated devem existir. Executor precisa CREATE no banco (schema novo), CREATE/USAGE em public, USAGE em auth, EXECUTE nas funções utilizadas e SELECT nas quatro tabelas. Usar role administrativa com bypass de RLS, como o postgres empregado pelas migrations locais; verificar owner efetivo do helper após aplicação.
- riftbattle_v2_private deve estar ausente. Qualquer objeto nesse schema indica colisão/aplicação anterior; não reaplicar. Em public, nenhuma função/procedure de nome validate_riftbattle_v2_squad deve existir, inclusive overloads. A consulta de colisões lista relações, tipos, funções e constraints do schema privado; nomes iguais em outros schemas não colidem.
- Objetos novos finais: schema riftbattle_v2_private; tabelas rules/validations; funções private.validate_squad e public.validate_riftbattle_v2_squad; PKs rules_pkey/validations_pkey; UNIQUE validations_owner_id_request_id_key; índice validations_owner_created_idx; FK validations_rules_version_fkey; checks de arrays, request_id e reward_applied. Nenhum CASCADE ou trigger novo.
- Revisar defaults de privilégios e event triggers remotos. Não expor riftbattle_v2_private na Data API. A flag frontend não é um bloqueio do endpoint.
- A migration não deve constar como aplicada em 20260922215435. A versão de regras nova será riftbattle-v2-preview-20260922.1. Registrar o hash/ACL/configuração de start_battle_atomic fornecido pelo preflight para comparação posterior; nenhuma chamada ao RPC antigo é necessária.

PRONTO PARA PRÉ-VALIDAÇÃO DO SUPABASE significa que os arquivos locais e consultas de inspeção estão preparados. Não significa que o SQL já foi instalado/testado nem autorização para produção. Os testes de quotas e concorrência do banco permanecem pendentes; as verificações offline dessas propriedades são estáticas.
