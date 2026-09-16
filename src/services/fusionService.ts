import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface FusionExecutionResult {
  success: boolean;
  message: string;
  outputAsset?: any;
  costNEX: number;
  burnedItemIds: string[];
  preservedItemId?: string;
  balanceNEX?: number;
  outputRarity?: string;
  requestId?: string;
  idempotent?: boolean;
}

interface FusionRpcResult {
  success: boolean;
  message?: string;

  input_rarity?: string;
  output_rarity?: string;

  success_rate?: number;
  charged_nex?: number;
  balance_nex?: number;

  burned_card_ids?: string[];
  preserved_card_id?: string | null;

  output_template_id?: string | null;
  output_card?: any | null;

  idempotent?: boolean;
}

export class FusionService {
  /**
   * Gera o identificador de uma operação lógica de fusão.
   * O mesmo ID deve ser reutilizado caso a mesma operação precise
   * ser reenviada ao servidor.
   */
  public static createRequestId(): string {
    return typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
      ? `fusion-${crypto.randomUUID()}`
      : `fusion-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
  }

  /**
   * Fusão online server-authoritative V2.
   *
   * O cliente envia somente:
   * - request_id
   * - IDs das 3 cartas
   *
   * Custo, raridade, chance, sorteio, consumo das cartas
   * e criação da carta resultante são decididos pelo servidor.
   *
   * IMPORTANTE:
   * requestId identifica uma única operação lógica.
   * Em caso de retry, reutilize exatamente o mesmo requestId.
   */
  public static async executeFusion(
    itemIds: string[],
    requestId: string
  ): Promise<FusionExecutionResult> {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'A Fusão V2 requer conexão com o servidor.'
      );
    }

    if (!Array.isArray(itemIds) || itemIds.length !== 3) {
      throw new Error(
        'A forja do reator requer exatamente 3 cartas como matéria-prima.'
      );
    }

    const uniqueIds = new Set(itemIds);

    if (uniqueIds.size !== 3) {
      throw new Error(
        'Selecione 3 cartas diferentes para realizar a fusão.'
      );
    }

    if (
      typeof requestId !== 'string' ||
      requestId.trim().length === 0
    ) {
      throw new Error(
        'Identificador da operação de fusão inválido.'
      );
    }

    const normalizedRequestId = requestId.trim();

    const { data, error } = await supabase.rpc(
      'execute_fusion_v2',
      {
        p_request_id: normalizedRequestId,
        p_card_ids: itemIds,
      }
    );

    if (error) {
      console.error(
        '[NEXA FUSION V2 RPC ERROR]',
        error
      );

      throw new Error(
        error.message ||
          'Não foi possível concluir a fusão no servidor.'
      );
    }

    if (!data || typeof data !== 'object') {
      throw new Error(
        'O servidor retornou um resultado inválido para a fusão.'
      );
    }

    const result = data as FusionRpcResult;

    if (typeof result.success !== 'boolean') {
      throw new Error(
        'O servidor não confirmou o resultado da fusão.'
      );
    }

    const burnedItemIds = Array.isArray(
      result.burned_card_ids
    )
      ? result.burned_card_ids.filter(
          (id): id is string =>
            typeof id === 'string'
        )
      : [];

    const chargedNEX = Number(
      result.charged_nex ?? 0
    );

    if (
      !Number.isFinite(chargedNEX) ||
      chargedNEX < 0
    ) {
      throw new Error(
        'O servidor retornou um custo inválido para a fusão.'
      );
    }

    const balanceNEX =
      result.balance_nex === undefined ||
      result.balance_nex === null
        ? undefined
        : Number(result.balance_nex);

    if (
      balanceNEX !== undefined &&
      (!Number.isFinite(balanceNEX) ||
        balanceNEX < 0)
    ) {
      throw new Error(
        'O servidor retornou um saldo inválido após a fusão.'
      );
    }

    return {
      success: result.success,

      message:
        result.message ||
        (result.success
          ? 'Fusão concluída com sucesso.'
          : 'A fusão não foi bem-sucedida.'),

      outputAsset:
        result.output_card || undefined,

      costNEX: chargedNEX,

      burnedItemIds,

      preservedItemId:
        result.preserved_card_id || undefined,

      balanceNEX,

      outputRarity:
        result.output_rarity || undefined,

      requestId: normalizedRequestId,

      idempotent: Boolean(
        result.idempotent
      ),
    };
  }
}