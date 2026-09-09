import { NexaAsset, NexaUser } from '../types';
import { FUSION_RULES } from '../config/fusionRules';
import { SecurityService } from './securityService';
import { RewardService } from './rewardService';

export interface FusionExecutionResult {
  success: boolean;
  message: string;
  outputAsset?: NexaAsset;
  costNEX: number;
  burnedItemIds: string[];
}

export class FusionService {
  /**
   * Execute 3-to-1 asset fusion
   */
  public static executeFusion(
    items: NexaAsset[],
    user: NexaUser
  ): FusionExecutionResult {
    // 1. Structural checks
    if (items.length !== 3) {
      throw new Error('A forja do reator requer exatamente 3 itens como matéria-prima.');
    }

    // 2. Ownership & Status
    for (const item of items) {
      SecurityService.validateOwnership(item, user.id);
      SecurityService.validateAssetAvailable(item);
    }

    // 3. Same rarity
    const baseRarity = items[0].rarity;
    const sameRarity = items.every((i) => i.rarity === baseRarity);
    if (!sameRarity) {
      throw new Error('Todos os 3 itens devem possuir a mesma raridade para sintetização.');
    }

    // 4. Rule check
    const rule = FUSION_RULES[baseRarity];
    if (!rule) {
      throw new Error(`Itens de raridade "${baseRarity}" já atingiram o ápice e não podem ser fundidos.`);
    }

    // 5. Balance check
    SecurityService.validateSufficientBalance(user, rule.costNEX, 'NEX');

    // 6. Roll success
    const roll = Math.random();
    const isSuccess = roll <= rule.successRate;

    const burnedItemIds = items.map((i) => i.id);

    if (isSuccess) {
      // Create new asset of outputRarity
      const newItem = RewardService.mintItem(rule.outputRarity, user.id, user.username);
      // Boost power by average of inputs
      const avgPower = Math.floor(items.reduce((acc, curr) => acc + ('power' in curr ? curr.power : 200), 0) / 3);
      newItem.power = Math.floor(avgPower * rule.bonusPowerMultiplier);
      newItem.name = `${newItem.name} (Sintetizado)`;
      newItem.edition = 'Forja Quântica';
      newItem.description = `${newItem.description} Forjado com sucesso através da fusão de 3 itens ${baseRarity}.`;

      return {
        success: true,
        message: `Fusão bem-sucedida! Você sintetizou um item de raridade ${rule.outputRarity}!`,
        outputAsset: newItem,
        costNEX: rule.costNEX,
        burnedItemIds,
      };
    } else {
      // Partial failure on risky tiers (Epic/Legendary)
      // Burn 2 items, return 1 as residue
      const preservedId = items[0].id;
      const actualBurned = [items[1].id, items[2].id];

      return {
        success: false,
        message: `Instabilidade no Reator! A síntese falhou (${Math.round(rule.successRate * 100)}% de chance). 2 itens foram desintegrados, mas 1 foi recuperado.`,
        costNEX: Math.floor(rule.costNEX * 0.5), // 50% cost on failure
        burnedItemIds: actualBurned,
      };
    }
  }
}
