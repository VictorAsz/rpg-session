// ============================================================================
// Character State Models — dados agregados para os stores
// ============================================================================

import { Character, Skill, Item, EquippedItem, Ability, Spell, Buff } from './rpg-models';

export interface CharacterSheet {
  character: Character;
  skills: Skill[];
  items: Item[];
  equipment: EquippedItem[];
  abilities: Ability[];
  spells: Spell[];
  buffs: Buff[];
}

export interface CharacterState {
  characters: Character[];
  sheets: Record<string, CharacterSheet>; // key = character_id
  isLoading: boolean;
  error: string | null;
}
