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
  // =========================================================
  // COMUM — OPERADORES DA FRONTEIRA
  // Combatentes que mantêm os setores externos da Rede Nexus.
  // =========================================================
  {
    templateId: 'char-tpl-neon-recruit',
    name: 'Recruta Neon',
    class: 'Guerreiro',
    rarity: 'Comum',
    basePower: 480,
    stats: { strength: 42, defense: 38, speed: 40 },
    description:
      'Combatente recém-integrado à Rede Nexus, equipado com lâmina de vibração e blindagem tática de campo.',
    image:
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    edition: 'Base 2026',
  },
  {
    templateId: 'char-tpl-cyber-operator',
    name: 'Operador Cibernético',
    class: 'Tecnomante',
    rarity: 'Comum',
    basePower: 460,
    stats: { strength: 36, defense: 34, speed: 46 },
    description:
      'Especialista de suporte capaz de reprogramar drones, sensores e sistemas de combate diretamente no campo.',
    image:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    edition: 'Base 2026',
  },
  {
    templateId: 'char-tpl-ruin-scout',
    name: 'Batedor das Ruínas',
    class: 'Caçador',
    rarity: 'Comum',
    basePower: 475,
    stats: { strength: 38, defense: 32, speed: 50 },
    description:
      'Rastreador dos setores abandonados de Neo-Terra, treinado para localizar ameaças antes que alcancem a Rede.',
    image:
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    edition: 'Base 2026',
  },

  // =========================================================
  // INCOMUM — AGENTES ESPECIALIZADOS
  // Unidades modificadas para operações de alto risco.
  // =========================================================
  {
    templateId: 'char-tpl-colossal-bastion',
    name: 'Bastião Colossal',
    class: 'Guardião',
    rarity: 'Incomum',
    basePower: 890,
    stats: { strength: 55, defense: 84, speed: 32 },
    description:
      'Guardião revestido por liga de titânio reforçada, projetado para permanecer de pé sob fogo balístico pesado.',
    image:
      'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=600&auto=format&fit=crop&q=80',
    edition: 'Edição Forja',
  },
  {
    templateId: 'char-tpl-underworld-duelist',
    name: 'Duelista do Submundo',
    class: 'Assassino',
    rarity: 'Incomum',
    basePower: 860,
    stats: { strength: 58, defense: 42, speed: 78 },
    description:
      'Veterano das arenas clandestinas, conhecido pelas lâminas térmicas integradas aos antebraços.',
    image:
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    edition: 'Submundo S1',
  },
  {
    templateId: 'char-tpl-pulse-tech',
    name: 'Tecnóloga de Pulso',
    class: 'Tecnomante',
    rarity: 'Incomum',
    basePower: 880,
    stats: { strength: 48, defense: 52, speed: 65 },
    description:
      'Engenheira de combate que domina campos eletrostáticos e pulsos capazes de interromper sistemas inimigos.',
    image:
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    edition: 'Setor Beta',
  },

  // =========================================================
  // RARO — ELITE DA REDE
  // Operadores cujo nome já circula entre os pilotos da Nexus.
  // =========================================================
  {
    templateId: 'char-tpl-nyx-shadow',
    name: 'Sombra de Nyx',
    class: 'Assassino',
    rarity: 'Raro',
    basePower: 1350,
    stats: { strength: 68, defense: 48, speed: 92 },
    description:
      'Assassino de assinatura espectral quase indetectável, especializado em ataques com plasma de baixa emissão.',
    image:
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    edition: 'Gênese S1',
  },
  {
    templateId: 'char-tpl-orion-sniper',
    name: 'Orion, Olho Estelar',
    class: 'Caçador',
    rarity: 'Raro',
    basePower: 1380,
    stats: { strength: 74, defense: 45, speed: 88 },
    description:
      'Atirador de elite cuja ótica gravitacional calcula o movimento do alvo instantes antes do disparo.',
    image:
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    edition: 'Caçadas Estelares',
  },
  {
    templateId: 'char-tpl-storm-invoker',
    name: 'Arauto da Tempestade',
    class: 'Mago',
    rarity: 'Raro',
    basePower: 1360,
    stats: { strength: 72, defense: 50, speed: 76 },
    description:
      'Canalizador atmosférico capaz de transformar a própria Arena em uma rede de descargas voltaicas.',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    edition: 'Tempestade S1',
  },

  // =========================================================
  // ÉPICO — NOMES DA ASCENSÃO
  // Combatentes que ultrapassaram os limites convencionais.
  // =========================================================
  {
    templateId: 'char-tpl-kaelen-renegade',
    name: 'Kaelen, o Renegado',
    class: 'Tecnomante',
    rarity: 'Épico',
    basePower: 1890,
    stats: { strength: 75, defense: 68, speed: 86 },
    description:
      'Engenheiro quântico exilado após aprender a converter instabilidades do vácuo em armamento temporal.',
    image:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    edition: 'Gênese S1',
  },
  {
    templateId: 'char-tpl-photon-sentinel',
    name: 'Sentinela de Fótons',
    class: 'Guardião',
    rarity: 'Épico',
    basePower: 1980,
    stats: { strength: 70, defense: 94, speed: 52 },
    description:
      'Defensor da Cidadela que converte impacto cinético em energia para alimentar seus próprios escudos.',
    image:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    edition: 'Guarda da Cidadela',
  },
  {
    templateId: 'char-tpl-phantom-blade',
    name: 'Lâmina Fantasma',
    class: 'Assassino',
    rarity: 'Épico',
    basePower: 1920,
    stats: { strength: 88, defense: 54, speed: 96 },
    description:
      'Combatente hiper-sincronizado que alterna entre fases dimensionais durante sequências de ataque.',
    image:
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    edition: 'Sombra Prime',
  },

  // =========================================================
  // LENDÁRIO — ÍCONES DA REDE NEXUS
  // Entidades capazes de alterar o rumo de uma batalha sozinhas.
  // =========================================================
  {
    templateId: 'char-tpl-ignis-prime',
    name: 'Ignis Prime',
    class: 'Mago',
    rarity: 'Lendário',
    basePower: 2750,
    stats: { strength: 92, defense: 58, speed: 78 },
    description:
      'Condutor de plasma estelar cuja armadura mantém confinada energia suficiente para devastar uma linha de batalha.',
    image:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    edition: 'Edição Ascensão',
  },
  {
    templateId: 'char-tpl-quantum-titan',
    name: 'Titã Quântico',
    class: 'Guardião',
    rarity: 'Lendário',
    basePower: 2840,
    stats: { strength: 86, defense: 98, speed: 60 },
    description:
      'Colosso mecânico alimentado por uma microssingularidade estabilizada no núcleo de sua couraça.',
    image:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    edition: 'Titãs Ancestrais',
  },

  // =========================================================
  // MÍTICO — SOBERANOS
  // O limite conhecido entre combatente, máquina e entidade.
  // =========================================================
  {
    templateId: 'char-tpl-valkyrie-apex',
    name: 'Valkíria Apex',
    class: 'Guerreiro',
    rarity: 'Mítico',
    basePower: 3890,
    stats: { strength: 98, defense: 90, speed: 92 },
    description:
      'Forjada em reatores de antimatéria, representa o ápice conhecido da engenharia combativa da Rede Nexus.',
    image:
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    edition: 'Soberano S1',
  },
  {
    templateId: 'char-tpl-chronos-sovereign',
    name: 'Cronos, o Soberano',
    class: 'Tecnomante',
    rarity: 'Mítico',
    basePower: 3950,
    stats: { strength: 96, defense: 94, speed: 90 },
    description:
      'Guardião dos nós temporais da NEXA, capaz de interferir nas sequências que determinam o destino de um combate.',
    image:
      'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop&q=80',
    edition: 'Soberano S1',
  },
];

/**
 * Instancia um objeto Character a partir de um template.
 */
export function instantiateCharacterFromTemplate(
  template: CharacterTemplate,
  ownerId: string,
  ownerName: string
): Character {
  const charId = `char-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 6)}`;

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