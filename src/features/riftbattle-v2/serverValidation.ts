import { RIFTBATTLE_ARENAS } from './arenaConfig';
import { RIFTBATTLE_V2_CARDS } from './cardCatalog';
import type { RiftBattleArenaConfig, RiftBattleCard } from './types';

/** Immutable contract: publish a new version/migration whenever combat rules change. */
export const RIFTBATTLE_RULES_VERSION = 'riftbattle-v2-preview-20260922.1';
export const RIFTBATTLE_VALIDATION_RPC = 'validate_riftbattle_v2_squad';

/** Same ASCII grammar as PostgreSQL, without trimming or rewriting idempotency keys. */
export function isValidRiftBattleRequestId(value: string): boolean {
  return typeof value === 'string' && value.length >= 1 && value.length <= 200
    && /^[A-Za-z0-9]/.test(value) && !/[^A-Za-z0-9._:-]/.test(value);
}

export interface RiftBattleValidationRequest {
  requestId: string;
  arenaId: string;
  instanceIds: readonly string[];
}

export interface RiftBattleValidationReceipt {
  success: true;
  validation_id: string;
  request_id: string;
  rules_version: typeof RIFTBATTLE_RULES_VERSION;
  arena: RiftBattleArenaConfig;
  cards: RiftBattleCard[];
  mode: 'VALIDATION_ONLY';
  authoritative: false;
  reward_applied: false;
  idempotent: boolean;
  validated_at: string;
}

export function validationParams(request: RiftBattleValidationRequest) {
  const arena = RIFTBATTLE_ARENAS.find(({ id }) => id === request.arenaId);
  if (!arena) throw new Error('Arena V2 inválida.');
  if (!isValidRiftBattleRequestId(request.requestId)) {
    throw new Error('request_id V2 inválido.');
  }
  if (request.instanceIds.length !== arena.teamSize || new Set(request.instanceIds).size !== arena.teamSize
    || request.instanceIds.some((id) => !id || id.trim() !== id || id.length > 200)) {
    throw new Error('Selecione a quantidade exata de instâncias distintas exigida pela arena.');
  }
  // No stats, templates, outcome, rewards or owner ID cross this trust boundary.
  return {
    p_request_id: request.requestId,
    p_arena_id: arena.id,
    p_rules_version: RIFTBATTLE_RULES_VERSION,
    p_instance_ids: [...request.instanceIds],
  };
}

export function parseValidationReceipt(raw: unknown, request: RiftBattleValidationRequest): RiftBattleValidationReceipt {
  validationParams(request);
  const result = raw as Partial<RiftBattleValidationReceipt> | null;
  const arena = RIFTBATTLE_ARENAS.find(({ id }) => id === request.arenaId)!;
  const invalid = () => new Error('Resposta de validação V2 inválida ou incompatível com as regras locais.');
  if (!result || result.success !== true || result.mode !== 'VALIDATION_ONLY'
    || result.authoritative !== false || result.reward_applied !== false
    || result.rules_version !== RIFTBATTLE_RULES_VERSION || result.request_id !== request.requestId
    || typeof result.validation_id !== 'string' || !result.validation_id
    || typeof result.idempotent !== 'boolean' || typeof result.validated_at !== 'string'
    || !Number.isFinite(Date.parse(result.validated_at))
    || !result.arena || result.arena.id !== arena.id || result.arena.teamSize !== arena.teamSize
    || result.arena.activeSlots !== arena.activeSlots || result.arena.abilitiesEnabled !== arena.abilitiesEnabled
    || result.arena.ruleset !== arena.ruleset || JSON.stringify(result.arena.energyByTurn) !== JSON.stringify(arena.energyByTurn)
    || !Array.isArray(result.cards) || result.cards.length !== arena.teamSize) throw invalid();
  result.cards.forEach((card, index) => {
    const definition = RIFTBATTLE_V2_CARDS.find(({ id }) => id === card?.templateId);
    if (!card || card.id !== request.instanceIds[index] || card.sourceInstanceId !== card.id || !definition
      || card.name !== definition.name || card.rarity !== definition.rarity || card.archetype !== definition.archetype
      || card.deployCost !== definition.deployCost || card.ability?.id !== definition.ability?.id
      || !card.stats || (['hp', 'attack', 'defense', 'speed'] as const).some((stat) => card.stats[stat] !== definition.stats[stat])) {
      throw invalid();
    }
  });
  return result as RiftBattleValidationReceipt;
}
