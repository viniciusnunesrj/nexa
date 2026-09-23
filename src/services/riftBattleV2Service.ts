import { getSupabaseConfigurationError, supabase } from '../lib/supabase';
import {
  parseValidationReceipt, RIFTBATTLE_VALIDATION_RPC, validationParams,
  type RiftBattleValidationRequest,
} from '../features/riftbattle-v2/serverValidation';
import type { RiftBattleAction, RiftBattleArenaConfig, RiftBattleCard } from '../features/riftbattle-v2/types';
import type { RiftBattleDifficulty } from '../features/riftbattle-v2/ai';

export interface RiftBattleAuthoritativeStart {
  success: true;
  runId: string;
  requestId: string;
  arena: RiftBattleArenaConfig;
  playerCards: RiftBattleCard[];
  opponentCards: RiftBattleCard[];
  difficulty: RiftBattleDifficulty;
}

export interface RiftBattleReward {
  outcome: 'VICTORY' | 'DEFEAT';
  xp_gained: number;
  nex_gained: number;
  nxa_gained: number;
  level_ups: number;
  level: number;
  experience: number;
  unlocked_slots: number;
  balance_nex: number;
  balance_nxa: number;
}

export async function startAuthoritativeRiftBattleV2(request: RiftBattleValidationRequest & { difficulty: RiftBattleDifficulty }): Promise<RiftBattleAuthoritativeStart> {
  const configurationError = getSupabaseConfigurationError();
  if (configurationError) throw new Error(configurationError);
  validationParams(request);
  const { data, error } = await supabase.functions.invoke('riftbattle-v2-authoritative', {
    body: { action: 'start', requestId: request.requestId, arenaId: request.arenaId, instanceIds: [...request.instanceIds], difficulty: request.difficulty },
  });
  if (error || !data?.success || !data?.runId || !data?.arena || !Array.isArray(data?.playerCards) || !Array.isArray(data?.opponentCards)) {
    throw new Error('Não foi possível iniciar a partida autoritativa do Rift Battle.');
  }
  return data as RiftBattleAuthoritativeStart;
}

export async function finishAuthoritativeRiftBattleV2(runId: string, actions: readonly RiftBattleAction[]): Promise<{ outcome: 'VICTORY' | 'DEFEAT'; reward: RiftBattleReward; idempotent: boolean }> {
  const configurationError = getSupabaseConfigurationError();
  if (configurationError) throw new Error(configurationError);
  const { data, error } = await supabase.functions.invoke('riftbattle-v2-authoritative', {
    body: { action: 'finish', runId, actions: [...actions] },
  });
  if (error || !data?.success || !data?.reward) throw new Error('O servidor não conseguiu confirmar a recompensa desta partida.');
  return data as { outcome: 'VICTORY' | 'DEFEAT'; reward: RiftBattleReward; idempotent: boolean };
}

/** Mantido para compatibilidade com o preflight antigo. Não concede recompensa. */
export async function validateRiftBattleV2Squad(request: RiftBattleValidationRequest) {
  const params = validationParams(request);
  const configurationError = getSupabaseConfigurationError();
  if (configurationError) throw new Error(configurationError);
  const { data, error } = await supabase.rpc(RIFTBATTLE_VALIDATION_RPC, params);
  if (error) throw new Error(`Falha na validação RiftBattle V2: ${error.message}`);
  return parseValidationReceipt(data, request);
}
