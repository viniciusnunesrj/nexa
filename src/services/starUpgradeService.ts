import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { mapRowToCard } from '../lib/supabaseMappers';
import { starRequirement, starUpgradeParams } from '../features/star-system/rules';
import type { Card } from '../types';

export interface StarUpgradeResult {
  card: Card;
  fragmentsSpent: number;
  costNEX: number;
  balanceNEX: number;
  idempotent: boolean;
  refreshPending?: boolean;
}

export class StarUpgradeRejected extends Error {}

export const StarUpgradeService = {
  createRequestId: () => `star-${crypto.randomUUID()}`,
  async executeStarUpgrade(mainId: string, requestId: string): Promise<StarUpgradeResult> {
    if (!isSupabaseConfigured()) throw new Error('A Ascensão requer conexão com o servidor.');
    const params = starUpgradeParams(mainId, requestId);
    const { data, error } = await supabase.rpc('execute_star_upgrade_v1', params);
    if (error) {
      if (/^(P0001|22...|23...|42501|42883|PGRST202)$/.test(error.code ?? '')) throw new StarUpgradeRejected(error.message);
      throw new Error(error.message);
    }
    if (data?.success !== true || data.request_id !== requestId || data.main_card?.id !== mainId
      || !Array.isArray(data.consumed_ids)
      || JSON.stringify([...data.consumed_ids].sort()) !== JSON.stringify(params.p_material_ids)
      || !Number.isInteger(data.main_card.star_level) || data.main_card.star_level < 2 || data.main_card.star_level > 5
      || data.previous_star !== data.main_card.star_level - 1
      || Number(data.charged_nex) !== starRequirement(data.previous_star)?.nex
      || data.consumed_ids.length !== 0
      || Number(data.fragments_spent) !== starRequirement(data.previous_star)?.fragments
      || data.template_id !== data.main_card.template_id
      || !Number.isFinite(Number(data.balance_nex)) || Number(data.balance_nex) < 0) {
      throw new Error('Resposta inesperada. Tente novamente para consultar a mesma operação.');
    }
    return { card: mapRowToCard(data.main_card), fragmentsSpent: Number(data.fragments_spent),
      costNEX: Number(data.charged_nex), balanceNEX: Number(data.balance_nex), idempotent: data.idempotent === true };
  },
};
