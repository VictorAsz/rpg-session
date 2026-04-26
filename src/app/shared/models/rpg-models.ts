// ============================================================================
// RPG Session — TypeScript Interfaces (espelha o schema PostgreSQL)
// ============================================================================

import { BaseEntity } from './base-entity.model';

// 1. USERS
export type UserRole = 'master' | 'player';

export interface User extends BaseEntity {
  name: string;
  password: string;
  role: UserRole;
}

// 2. CHARACTERS
export interface Character extends BaseEntity {
  user_id: string;
  name: string;
  race: string;
  biography: string;
  photo_url: string;
  notes: string;

  // Atributos principais
  hp: number;
  hp_max: number;
  magic: number;
  magic_max: number;
  mana: number;
  mana_max: number;
  xp: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  inspiration: number;

  updated_at: string;
}

// 3. SKILLS
export interface Skill extends BaseEntity {
  character_id: string;
  name: string;
  proficient: boolean; // toggle
  bonus: number;
}

// 4. ITEMS
export interface EffectFormula {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'modify_attribute' | 'custom';
  formula: string; // ex: "2d10 + STR_MOD"
  attribute?: string; // atributo alvo (para modify_attribute)
  description?: string;
}

export interface Item extends BaseEntity {
  character_id: string;
  name: string;
  description: string;
  quantity: number; // empilhável
  effect: EffectFormula;
}

// 5. EQUIPPED ITEMS
export type EquipmentSlot =
  | 'left_hand'
  | 'right_hand'
  | 'head'
  | 'body'
  | 'legs'
  | 'boots'
  | 'gloves'
  | 'accessory_1'
  | 'accessory_2';

export interface EquippedItem extends BaseEntity {
  character_id: string;
  item_id: string | null; // null = slot vazio
  slot: EquipmentSlot;
}

// 6. ABILITIES
export interface Ability extends BaseEntity {
  character_id: string;
  name: string;
  description: string;
  effect: EffectFormula;
}

// 7. SPELLS
export interface Spell extends BaseEntity {
  character_id: string;
  name: string;
  description: string;
  mana_cost: number;
  effect: EffectFormula;
}

// 8. BUFFS / DEBUFFS
export type BuffType = 'buff' | 'debuff' | 'passive';
export type BuffSource = 'ability' | 'spell' | 'item' | 'manual';

export interface Buff extends BaseEntity {
  character_id: string;
  name: string;
  description: string;
  type: BuffType;
  effect: EffectFormula;
  source: BuffSource;
  duration: number; // -1 = permanente, 0 = instantâneo, >0 = rodadas
  expires_at: string | null; // null = permanente/indefinido
}

// 9. DOCUMENTS
export interface Document extends BaseEntity {
  title: string;
  body: string;
  is_private: boolean;
  owner_user_id: string | null; // dono do documento privado
}

// 10. DICE ROLLS
export interface DiceRollDetails {
  dice: Array<{ count: number; sides: number; results: number[] }>;
  attributeMods: Record<string, number>;
  constantMod: number;
}

export interface DiceRoll extends BaseEntity {
  roller_user_id: string;
  character_id: string | null;
  notation: string; // ex: "2d10 + STR + 3"
  result: number;
  details: DiceRollDetails;
  rolled_at: string;
}

// 11. CHAT MESSAGES
export type MessageType = 'public' | 'whisper' | 'system';

export interface ChatMessage extends BaseEntity {
  sender_user_id: string;
  type: MessageType;
  content: string;
  target_user_id: string | null; // apenas para whisper
}
