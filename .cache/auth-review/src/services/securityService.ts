import { NexaAsset, NexaUser } from '../types';

export class SecurityService {
  /**
   * Validate that a monetary or currency amount is strictly valid and positive
   */
  public static validatePositiveAmount(amount: number, fieldName = 'Valor'): void {
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      throw new Error(`[Segurança] ${fieldName} inválido.`);
    }
    if (amount <= 0) {
      throw new Error(`[Segurança] ${fieldName} deve ser estritamente maior que zero.`);
    }
  }

  /**
   * Validate that user has sufficient balance
   */
  public static validateSufficientBalance(
    user: NexaUser,
    requiredAmount: number,
    currency: 'NEX' | 'NXA'
  ): void {
    this.validatePositiveAmount(requiredAmount, `Quantidade de ${currency}`);
    const currentBalance = currency === 'NEX' ? user.balanceNEX : user.balanceNXA;
    if (currentBalance < requiredAmount) {
      throw new Error(
        `[Saldo Insuficiente] Você possui ${currentBalance.toLocaleString()} ${currency}, mas a operação requer ${requiredAmount.toLocaleString()} ${currency}.`
      );
    }
  }

  /**
   * Validate that the user actually owns the specified asset
   */
  public static validateOwnership(asset: NexaAsset, expectedOwnerId: string): void {
    if (asset.ownerId !== expectedOwnerId) {
      throw new Error(`[Violação de Posse] O item "${asset.name}" não pertence ao usuário ativo.`);
    }
  }

  /**
   * Validate asset is not locked in another active operation
   */
  public static validateAssetAvailable(asset: NexaAsset): void {
    if (asset.type === 'Card') {
      const cardState = (asset as any).state || (asset as any).cardStatus;
      if (cardState !== 'FREE' || !(asset as any).tradeable) {
        const reason =
          cardState === 'ACTIVE'
            ? 'em sintetização ativa (ACTIVE)'
            : cardState === 'EXHAUSTED'
            ? 'com produção esgotada (EXHAUSTED)'
            : 'indisponível para negociação';
        throw new Error(
          `[Carta Vinculada] A carta colecionável "${asset.name}" está ${reason} e não pode mais ser vendida, listada ou transferida.`
        );
      }
    }

    if (asset.status !== 'IDLE' && asset.status !== 'EQUIPPED') {
      throw new Error(
        `[Item Indisponível] O item "${asset.name}" está bloqueado em outra operação (${asset.status}).`
      );
    }
  }
}
