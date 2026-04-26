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

// Shared effect type
export interface EffectFormula {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'modify_attribute' | 'custom';
  formula: string; // ex: "2d10 + STR_MOD"
  attribute?: string;
  description?: string;
}

// 4. ITEMS — DEPRECATED per-character (use ItemCatalog + CharacterItem)
export interface Item extends BaseEntity {
  character_id: string;
  name: string;
  description: string;
  quantity: number;
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

// 6. ABILITIES — DEPRECATED (use SpellCatalog + CharacterSpell)
// 7. SPELLS — DEPRECATED (use SpellCatalog + CharacterSpell)

// 6. ABILITIES — DEPRECATED per-character (use AbilitiesCatalog + CharacterAbility)
export interface Ability extends BaseEntity {
  character_id: string;
  name: string;
  description: string;
  effect: EffectFormula;
}

// 7. SPELLS — DEPRECATED per-character (use SpellCatalog + CharacterSpell)
export interface Spell extends BaseEntity {
  character_id: string;
  name: string;
  description: string;
  mana_cost: number;
  effect: EffectFormula;
}

// 6+7. SPELLS CATALOG (compêndio global de magias)
export interface SpellCatalog extends BaseEntity {
  name: string;
  description: string;
  image_url: string;
  mana_cost: number;
  type_cast: 'ritual' | 'truque' | 'conjuracao' | 'invocacao' | 'encantamento';
  school: string;
  element: string;
  requirement: string;
  target_type: string;
  level: number;
  is_visible: boolean;
  effect: EffectFormula;
}

export interface CharacterSpell extends BaseEntity {
  character_id: string;
  catalog_id: string;
}

// Abilities Catalog (compêndio global de habilidades)
export interface AbilityCatalog extends BaseEntity {
  name: string;
  description: string;
  image_url: string;
  cost_type: 'mana' | 'hp' | 'none';
  cost_amount: number;
  ability_type: 'passiva' | 'ativa' | 'reacao';
  school: string;
  element: string;
  requirement: string;
  target_type: string;
  level: number;
  is_visible: boolean;
  effect: EffectFormula;
}

export interface CharacterAbility extends BaseEntity {
  character_id: string;
  catalog_id: string;
}

// 7. SPELLS — DEPRECATED per-character (use SpellCatalog + CharacterSpell)
export interface Spell extends BaseEntity {
  character_id: string;
  name: string;
  description: string;
  mana_cost: number;
  effect: EffectFormula;
}

// 6+7. SPELLS CATALOG (compêndio global)
export interface SpellCatalog extends BaseEntity {
  name: string;
  description: string;
  image_url: string;
  mana_cost: number;
  type: 'spell' | 'ability';
  school: string;
  element: string;
  requirement: string;
  target_type: string;
  level: number;
  is_magic: boolean;
  is_visible: boolean;
  effect: EffectFormula;
}

// Character learns a spell/ability from catalog
export interface CharacterSpell extends BaseEntity {
  character_id: string;
  catalog_id: string;
}

// 4. ITEMS CATALOG (compêndio global)
export interface ItemCatalog extends BaseEntity {
  name: string;
  description: string;
  image_url: string;
  value: number;
  is_usable: boolean;
  effect: EffectFormula;
}

// Character owns an item from catalog
export interface CharacterItem extends BaseEntity {
  character_id: string;
  catalog_id: string;
  quantity: number;
  equipped: boolean;
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
