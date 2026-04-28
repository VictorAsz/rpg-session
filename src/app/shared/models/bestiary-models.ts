import type { BaseEntity } from './base-entity.model';
import type {
  CreatureRarity, CreatureClassification, CreatureBiome,
  CreatureDiet, CreatureBehavior, IntelligenceLevel,
} from './bestiary-types';

export interface Creature extends BaseEntity {
  name: string;
  description: string;
  short_description: string;
  level: number;
  rarity: CreatureRarity;
  is_public: boolean;
  is_playable: boolean;
  image: string;
  token_image: string;
  species: string;
  classification: CreatureClassification;
  habitat: string;
  region: string;
  biome: CreatureBiome;
  diet: CreatureDiet;
  behavior: CreatureBehavior;
  intelligence_level: IntelligenceLevel;
  language: string;
  lifespan: string;
  reproduction: string;
  growth_stages: string[];

  // Combat
  hp: number;
  mana: number;
  armor: number;
  speed: number;
  initiative: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;

  // Arrays
  skills: string[];
  resistances: string[];
  weaknesses: string[];
  immunities: string[];
  damage_types: string[];
  loot_table: string[];

  updated_at: string;
}

export interface CreatureAbility extends BaseEntity {
  creature_id: string;
  ability_id: string | null;
  spell_id: string | null;
  slot_type: 'active' | 'passive';
}
