import { Rarity, GameItem, AssetType, BoxType } from '../types';
import { DROP_RATES } from '../config/dropRates';
import { GAMEPLAY_BOX_DROP_RATES } from '../config/boxRates';

const LOOT_TEMPLATES: Record<Rarity, Array<{ name: string; type: AssetType; basePower: number; desc: string; img: string }>> = {
  Comum: [
    {
      name: 'Rifle Cinético Compacto',
      type: 'Weapon',
      basePower: 130,
      desc: 'Armamento de serviço básico padrão militar.',
      img: 'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Colete de Kevlar Sintético',
      type: 'Armor',
      basePower: 120,
      desc: 'Proteção leve contra impactos balísticos simples.',
      img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Bateria de Fótons Desgastada',
      type: 'Artifact',
      basePower: 110,
      desc: 'Módulo energético com capacidade residual útil.',
      img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    },
  ],
  Incomum: [
    {
      name: 'Lâmina de Plasma Frio',
      type: 'Weapon',
      basePower: 320,
      desc: 'Emite filamento luminoso capaz de queimar matéria sólida.',
      img: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Escudo Cinético de Polímero',
      type: 'Armor',
      basePower: 300,
      desc: 'Gera micro-repulsão sob impacto de projéteis.',
      img: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80',
    },
  ],
  Raro: [
    {
      name: 'Desintegrador Sônico',
      type: 'Weapon',
      basePower: 540,
      desc: 'Emite frequências de ressonância que quebram escudos de energia.',
      img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Peitoral de Nanofibra Gravitacional',
      type: 'Armor',
      basePower: 510,
      desc: 'Dissipa o momentum de projéteis pesados em campo quântico.',
      img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    },
  ],
  Épico: [
    {
      name: 'Foice de Antimatéria',
      type: 'Weapon',
      basePower: 820,
      desc: 'Corta através de qualquer liga molecular conhecida.',
      img: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Coração de Estrela de Nêutrons',
      type: 'Artifact',
      basePower: 850,
      desc: 'Gera campos magnéticos de magnitude astronômica.',
      img: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop&q=80',
    },
  ],
  Lendário: [
    {
      name: 'Canhão Dimensional Oblivion',
      type: 'Weapon',
      basePower: 1450,
      desc: 'Abre fissuras no continuum para engolir alvos na arena.',
      img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Orbe da Eternidade',
      type: 'Artifact',
      basePower: 1380,
      desc: 'Relíquia ancestral pré-colapso que manipula o tempo.',
      img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    },
  ],
  Mítico: [
    {
      name: 'Lâmina do Soberano Primordial',
      type: 'Weapon',
      basePower: 2600,
      desc: 'A arma cósmica definitiva forjada no nascimento do universo NEXA.',
      img: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    },
  ],
};

export class RewardService {
  /**
   * Rolls a random rarity based on cumulative DROP_RATES
   */
  public static rollRarity(): Rarity {
    const rand = Math.random();
    let cumulative = 0;

    const tiers: Rarity[] = ['Mítico', 'Lendário', 'Épico', 'Raro', 'Incomum', 'Comum'];
    
    // Check from rarest to common
    for (const rarity of tiers) {
      cumulative += DROP_RATES[rarity].rate;
      if (rand <= cumulative) {
        return rarity;
      }
    }
    return 'Comum';
  }

  /**
   * Generates a newly minted item asset
   */
  public static mintItem(
    rarity: Rarity,
    ownerId: string,
    ownerName: string
  ): GameItem {
    const templates = LOOT_TEMPLATES[rarity] || LOOT_TEMPLATES.Comum;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const randomLevel = Math.floor(Math.random() * 3) + 1;
    const power = template.basePower + randomLevel * 25;

    return {
      id,
      name: template.name,
      type: template.type as 'Weapon' | 'Armor' | 'Skin' | 'Artifact',
      rarity,
      level: randomLevel,
      power,
      edition: 'Temporada 1',
      ownerId,
      ownerName,
      createdAt: new Date().toISOString().split('T')[0],
      description: template.desc,
      status: 'IDLE',
      image: template.img,
      bonusStats: {
        stat: 'power',
        value: Math.floor(power * 0.15),
      },
    };
  }

  /**
   * Calculates battle result rewards
   */
  public static calculateBattleRewards(
    victory: boolean,
    userLevel: number,
    ownerId: string,
    ownerName: string
  ) {
    if (!victory) {
      return {
        victory: false,
        xpGained: 50,
        nexGained: 25,
        nxaGained: 0,
        droppedItem: null,
      };
    }

    // Victory: base reward of +100 NEX, +10 NXA, +150 XP
    const rolledRarity = this.rollRarity();
    const dropItemChance = 0.85; // 85% chance of item drop on victory
    const hasItem = Math.random() <= dropItemChance;

    const droppedItem = hasItem ? this.mintItem(rolledRarity, ownerId, ownerName) : null;
    const nexGained = 100;
    const nxaGained = 10;
    const xpGained = 150;

    // Sorteio de drop de caixa (25% de chance de Caixa Básica na vitória)
    const hasDroppedBox = Math.random() <= GAMEPLAY_BOX_DROP_RATES.VICTORY_BASIC_BOX_CHANCE;
    const droppedBoxType: BoxType | null = hasDroppedBox ? 'BASIC' : null;

    return {
      victory: true,
      xpGained,
      nexGained,
      nxaGained,
      droppedItem,
      droppedBoxType,
    };
  }
}
