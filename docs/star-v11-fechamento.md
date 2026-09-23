# Fechamento V2 / Star V1.1

PRONTO PARA COMMIT/PREVIEW

Verificado: TypeScript; build de produção; 14 testes Star V1.1; 14 testes RiftBattle V2;
renderização de Síntese; smoke remoto autenticado com dados sintéticos e ROLLBACK.
O build precisou ser repetido fora do sandbox por bloqueio de leitura, passando sem alteração de código.
Nenhum commit, push, merge ou deploy realizado. Nenhuma conta real usada em testes.

## Incluir no commit

- `src/App.tsx`
- `src/pages/Login.tsx` — acompanha o retorno à rota protegida V2 em App.
- `src/pages/RiftBattleV2.tsx`
- `src/pages/Fusion.tsx`
- `src/components/common/AssetCard.tsx`
- `src/contexts/GameStateContext.tsx`
- `src/lib/supabaseMappers.ts`
- `src/types/collections.ts`
- `src/types/economy.ts`
- `src/features/riftbattle-v2/ai.ts`
- `src/features/riftbattle-v2/arenaConfig.ts`
- `src/features/riftbattle-v2/battleEngine.ts`
- `src/features/riftbattle-v2/cardCatalog.ts`
- `src/features/riftbattle-v2/inventoryAdapter.ts`
- `src/features/riftbattle-v2/rules.ts`
- `src/features/riftbattle-v2/serverValidation.ts`
- `src/features/riftbattle-v2/types.ts`
- `src/features/star-system/rules.ts`
- `src/services/riftBattleV2Service.ts`
- `src/services/starUpgradeService.ts`
- `scripts/test-riftbattle-v2-validation.cjs`
- `scripts/test-star-system.cjs`
- `scripts/check-star-schema-exposure.mjs`
- `supabase/migrations/20260922215435_riftbattle_v2_validation.sql`
- `supabase/migrations/20260923010000_star_system_v1.sql` — histórico V1, não reaplicar.
- `supabase/migrations/20260923005141_star_system_v1_1_fragments.sql` — complementar já aplicada.
- `docs/riftbattle-v2-preflight.sql`
- `docs/riftbattle-v2-validation.md`
- `docs/star-system-preflight.sql`
- `docs/star-system-rollback-tests.sql` — histórico V1, não executar contra V1.1.
- `docs/star-system-supabase-validation.md` — histórico V1.
- `docs/star-system-v1.md` — regra vigente e histórico.
- `docs/star-system-v1-1-smoke.sql`
- `docs/star-v11-fechamento.md`

## Não incluir neste commit

- `src/components/common/RarityBadge.tsx` — ajuste visual independente.
- `src/services/authService.ts` — alteração anterior de starter kit.
- `supabase/schema.sql` — alteração anterior do saldo inicial NXA.
- `.github/github-app.yml`
- `supabase/.temp/`
- `src/pages/Play - Copiabackup - Copia.tsx`
- `0)`
- `findstr`
- `{})`
- Arquivo solto com nome iniciado por `cservicessupabaseService.ts`.
- Arquivo solto com nome iniciado por `upabase` e contendo `git push -u origin main`.

## Flag e bloqueadores

`VITE_RIFTBATTLE_V2_SERVER_VALIDATION=true` habilita a validação remota de V2;
requer a migration V2 no ambiente de destino. Ausente/false mantém o modo local.

Nenhum bloqueador encontrado para commit/preview no ambiente atual.
As migrations Star já estão instaladas sob versões remotas geradas pela ferramenta:
V1 `20260922235803`; V1.1 `20260923005449`. Não executar migrations pendentes em lote.
Os nomes locais não representam a ordem de bootstrap: em um banco novo, executar V1 antes de V1.1.
