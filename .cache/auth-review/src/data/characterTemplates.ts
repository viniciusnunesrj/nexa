import { Character, CharacterStats, NexaClass, Rarity } from '../types';

export interface CharacterTemplate {
  templateId: string;
  name: string;
  class: NexaClass;
  rarity: Rarity;
  basePower: number;
  stats: CharacterStats;
  description: string;
  image: string;
  edition: string;
}

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  // --- COMUM ---
  {
    templateId: 'char-tpl-neon-recruit',
    name: 'Recruta Neon',
    class: 'Guerreiro',
    rarity: 'Comum',
    basePower: 480,
    stats: { strength: 42, defense: 38, speed: 40 },
    description: 'Combatente recém-chegado ao setor periférico com lâmina de vibração e blindagem básica.',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    edition: 'Base 2026',
  },
  {
    templateId: 'char-tpl-cyber-operator',
    name: 'Operador Cibernético',
    class: 'Tecnomante',
    rarity: 'Comum',
    basePower: 460,
    stats: { strength: 36, defense: 34, speed: 46 },
    description: 'Técnico de suporte de campo especializado em reprogramação de drones de reconhecimento.',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    edition: 'Base 2026',
  },
  {
    templateId: 'char-tpl-ruin-scout',
    name: 'Batedor das Ruínas',
    class: 'Caçador',
    rarity: 'Comum',
    basePower: 475,
    stats: { strength: 38, defense: 32, speed: 50 },
    description: 'Rastreador ágil dos setores abandonados de Neo-Terra com rifles de precisão táticos.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    edition: 'Base 2026',
  },

  // --- INCOMUM ---
  {
    templateId: 'char-tpl-colossal-bastion',
    name: 'Bastião Colossal',
    class: 'Guardião',
    rarity: 'Incomum',
    basePower: 890,
    stats: { strength: 55, defense: 84, speed: 32 },
    description: 'Blindagem de liga de titânio enriquecido capaz de repelir bombardeios balísticos pesados.',
    image: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=600&auto=format&fit=crop&q=80',
    edition: 'Edição Forja',
  },
  {
    templateId: 'char-tpl-underworld-duelist',
    name: 'Duelista do Submundo',
    class: 'Assassino',
    rarity: 'Incomum',
    basePower: 860,
    stats: { strength: 58, defense: 42, speed: 78 },
    description: 'Lutador clandestino mestre em lâminas térmicas acopladas aos antebraços.',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    edition: 'Submundo S1',
  },
  {
    templateId: 'char-tpl-pulse-tech',
    name: 'Tecnóloga de Pulso',
    class: 'Tecnomante',
    rarity: 'Incomum',
    basePower: 880,
    stats: { strength: 48, defense: 52, speed: 65 },
    description: 'Especialista em campos de contenção eletrostática e impulsos de interferência.',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    edition: 'Setor Beta',
  },

  // --- RARO ---
  {
    templateId: 'char-tpl-nyx-shadow',
    name: 'Sombra de Nyx',
    class: 'Assassino',
    rarity: 'Raro',
    basePower: 1350,
    stats: { strength: 68, defense: 48, speed: 92 },
    description: 'Especialista em camuflagem espectral e ataques fulminantes com dardos de plasma frio.',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    edition: 'Gênese S1',
  },
  {
    templateId: 'char-tpl-orion-sniper',
    name: 'Orion Franco-Atirador',
    class: 'Caçador',
    rarity: 'Raro',
    basePower: 1380,
    stats: { strength: 74, defense: 45, speed: 88 },
    description: 'Equipado com ótica gravitacional que prevê a trajetória do alvo milissegundos antes do disparo.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    edition: 'Caçadas Estelares',
  },
  {
    templateId: 'char-tpl-storm-invoker',
    name: 'Invocador de Tempestade',
    class: 'Mago',
    rarity: 'Raro',
    basePower: 1360,
    stats: { strength: 72, defense: 50, speed: 76 },
    description: 'Manipulador de cargas atmosféricas capaz de ionizar a arena com arcos voltaicos contínuos.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    edition: 'Tempestade S1',
  },

  // --- ÉPICO ---
  {
    templateId: 'char-tpl-kaelen-renegade',
    name: 'Kaelen O Renegado',
    class: 'Tecnomante',
    rarity: 'Épico',
    basePower: 1890,
    stats: { strength: 75, defense: 68, speed: 86 },
    description: 'Engenheiro quântico que dobrou as frequências do vácuo para disparar feixes temporais colapsantes.',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    edition: 'Gênese S1',
  },
  {
    templateId: 'char-tpl-photon-sentinel',
    name: 'Sentinela de Fótons',
    class: 'Guardião',
    rarity: 'Épico',
    basePower: 1980,
    stats: { strength: 70, defense: 94, speed: 52 },
    description: 'Projeta cúpulas de absorção cinética que convertem impacto inimigo em regeneração de sistemas.',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    edition: 'Guarda da Cidadela',
  },
  {
    templateId: 'char-tpl-phantom-blade',
    name: 'Lâmina Fantasma',
    class: 'Assassino',
    rarity: 'Épico',
    basePower: 1920,
    stats: { strength: 88, defense: 54, speed: 96 },
    description: 'Combatente hiper-sincronizado que transita entre fases dimensionais a cada ataque crítico.',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    edition: 'Sombra Prime',
  },

  // --- LENDÁRIO ---
  {
    templateId: 'char-tpl-ignis-prime',
    name: 'Ignis Prime',
    class: 'Mago',
    rarity: 'Lendário',
    basePower: 2750,
    stats: { strength: 92, defense: 58, speed: 78 },
    description: 'Manipulador supremo de plasma estelar condensado, que incinera frotas com feixes superaquecidos.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    edition: 'Edição Ascensão',
  },
  {
    templateId: 'char-tpl-quantum-titan',
    name: 'Titã de Aço Quântico',
    class: 'Guardião',
    rarity: 'Lendário',
    basePower: 2840,
    stats: { strength: 86, defense: 98, speed: 60 },
    description: 'Construção mecânica colossal alimentada por um microssingularidade de buraco negro.',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    edition: 'Titãs Ancestrais',
  },

  // --- MÍTICO ---
  {
    templateId: 'char-tpl-valkyrie-apex',
    name: 'Valkíria Apex',
    class: 'Guerreiro',
    rarity: 'Mítico',
    basePower: 3890,
    stats: { strength: 98, defense: 90, speed: 92 },
    description: 'A entidade suprema forjada nos fornos de antimatéria. O ápice absoluto da evolução combativa.',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    edition: 'Soberano S1',
  },
  {
    templateId: 'char-tpl-chronos-sovereign',
    name: 'Cronos O Soberano',
    class: 'Tecnomante',
    rarity: 'Mítico',
    basePower: 3950,
    stats: { strength: 96, defense: 94, speed: 90 },
    description: 'Guardião dos nós temporais da rede NEXA com autoridade para remodelar o resultado dos combates.',
    image: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop&q=80',
    edition: 'Soberano S1',
  },
];

/**
 * Instancia um objeto Character a partir de um template
 */
export function instantiateCharacterFromTemplate(
  template: CharacterTemplate,
  ownerId: string,
  ownerName: string
): Character {
  const charId = `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return {
    id: charId,
    name: template.name,
    type: 'Character',
    class: template.class,
    rarity: template.rarity,
    level: 1,
    power: template.basePower,
    experience: 0,
    maxExperience: 500,
    stats: { ...template.stats },
    edition: template.edition,
    ownerId,
    ownerName,
    createdAt: new Date().toISOString().split('T')[0],
    description: template.description,
    status: 'IDLE',
    image: template.image,
  };
}
