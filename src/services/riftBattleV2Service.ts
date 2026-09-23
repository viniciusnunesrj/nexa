import { getSupabaseConfigurationError, supabase } from '../lib/supabase';
import {
  parseValidationReceipt, RIFTBATTLE_VALIDATION_RPC, validationParams,
  type RiftBattleValidationRequest,
} from '../features/riftbattle-v2/serverValidation';

/** A receipt validates an inventory snapshot, never a result or reward entitlement.
 * Retry a failed/uncertain request with the SAME requestId and payload.
 * Use a NEW requestId for a new match/fresh inventory validation.
 * Errors propagate; there is deliberately no automatic fallback to legacy combat.
 */
export async function validateRiftBattleV2Squad(request: RiftBattleValidationRequest) {
  const params = validationParams(request);
  const configurationError = getSupabaseConfigurationError();
  if (configurationError) throw new Error(configurationError);
  const { data, error } = await supabase.rpc(RIFTBATTLE_VALIDATION_RPC, params);
  if (error) throw new Error(`Falha na validação RiftBattle V2: ${error.message}`);
  return parseValidationReceipt(data, request);
}
