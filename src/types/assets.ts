import { Card } from './collections';

export type AssetType = 'Character' | 'Weapon' | 'Armor' | 'Skin' | 'Artifact' | 'Card';

export type NexaClass = 
  | 'Guerreiro' 
  | 'Mago' 
  | 'Assassino' 
  | 'Guardião' 
  | 'Caçador' 
  | 'Tecnomante';

export type Rarity = 
  | 'Comum' 
  | 'Incomum' 
  | 'Raro' 
  | 'Épico' 
  | 'Lendário' 
  | 'Mítico';

export type AssetStatus = 'IDLE' | 'LISTED' | 'TRADING' | 'EQUIPPED' | 'FUSING' | 'ACTIVE' | 'EXHAUSTED';

export interface CharacterStats {
  strength: number;
  defense: number;
  speed: number;
}

export interface BaseAsset {
  id: string;
  name: string;
  type: AssetType;
  rarity: Rarity;
  image: string;
  edition: string; // e.g. "Gênese", "Temporada 1", "Sombra Prime"
  ownerId: string;
  ownerName: string;
  createdAt: string;
  description: string;
  status: AssetStatus;
  isEquipped?: boolean;
}

export interface Character extends BaseAsset {
  type: 'Character';
  class: NexaClass;
  level: number;
  power: number;
  stats: CharacterStats;
  experience: number;
  maxExperience: number;
}

export interface GameItem extends BaseAsset {
  type: 'Weapon' | 'Armor' | 'Skin' | 'Artifact';
  level: number;
  power: number;
  bonusStats?: {
    stat: 'strength' | 'defense' | 'speed' | 'power';
    value: number;
  };
}

export type NexaAsset = Character | GameItem | Card;
