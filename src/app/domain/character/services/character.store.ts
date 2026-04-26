import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '../../base/store';
import type {
  Character,
  Skill,
  Item,
  EquippedItem,
  Ability,
  Spell,
  Buff,
} from '../../../shared/models/rpg-models';
import type { CharacterSheet, CharacterState } from '../../../shared/models/character-state.model';

const INITIAL_STATE: CharacterState = {
  characters: [],
  sheets: {},
  isLoading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class CharacterStore extends Store<CharacterState> {
  constructor() {
    super(INITIAL_STATE);
  }

  get initialState(): CharacterState {
    return {
      characters: [],
      sheets: {},
      isLoading: false,
      error: null,
    };
  }

  readonly characters$: Observable<Character[]> = this.select((s) => s.characters);
  readonly sheets$: Observable<Record<string, CharacterSheet>> = this.select((s) => s.sheets);
  readonly isLoading$: Observable<boolean> = this.select((s) => s.isLoading);
  readonly error$: Observable<string | null> = this.select((s) => s.error);

  characterSheet$(characterId: string): Observable<CharacterSheet | undefined> {
    return this.select((s) => s.sheets[characterId]);
  }

  // ── Characters ──────────────────────────────────────────────────────

  upsertCharacter(character: Character): void {
    const s = this.snapshot;
    const idx = s.characters.findIndex((c) => c.id === character.id);
    const chars =
      idx >= 0
        ? s.characters.map((c, i) => (i === idx ? character : c))
        : [...s.characters, character];

    const existing = s.sheets[character.id];
    const sheet: CharacterSheet = existing
      ? { ...existing, character }
      : {
          character,
          skills: [],
          items: [],
          equipment: [],
          abilities: [],
          spells: [],
          buffs: [],
        };

    this.patch({
      characters: chars,
      sheets: { ...s.sheets, [character.id]: sheet },
    });
  }

  removeCharacter(id: string): void {
    const s = this.snapshot;
    const { [id]: _, ...sheets } = s.sheets;
    this.patch({
      characters: s.characters.filter((c) => c.id !== id),
      sheets,
    });
  }

  // ── Skills ──────────────────────────────────────────────────────────

  upsertSkill(skill: Skill): void {
    const sheet = this.getOrCreateSheet(skill.character_id);
    const idx = sheet.skills.findIndex((sk) => sk.id === skill.id);
    sheet.skills =
      idx >= 0
        ? sheet.skills.map((sk, i) => (i === idx ? skill : sk))
        : [...sheet.skills, skill];
    this.commitSheet(skill.character_id, sheet);
  }

  removeSkill(id: string, characterId: string): void {
    const sheet = this.snapshot.sheets[characterId];
    if (!sheet) return;
    this.commitSheet(characterId, {
      ...sheet,
      skills: sheet.skills.filter((sk) => sk.id !== id),
    });
  }

  // ── Items ───────────────────────────────────────────────────────────

  upsertItem(item: Item): void {
    const sheet = this.getOrCreateSheet(item.character_id);
    const idx = sheet.items.findIndex((i) => i.id === item.id);
    sheet.items =
      idx >= 0
        ? sheet.items.map((i, n) => (n === idx ? item : i))
        : [...sheet.items, item];
    this.commitSheet(item.character_id, sheet);
  }

  removeItem(id: string, characterId: string): void {
    const sheet = this.snapshot.sheets[characterId];
    if (!sheet) return;
    this.commitSheet(characterId, {
      ...sheet,
      items: sheet.items.filter((i) => i.id !== id),
    });
  }

  // ── Equipped Items ──────────────────────────────────────────────────

  upsertEquippedItem(equip: EquippedItem): void {
    const sheet = this.getOrCreateSheet(equip.character_id);
    const idx = sheet.equipment.findIndex(
      (e) => e.id === equip.id || e.slot === equip.slot,
    );
    sheet.equipment =
      idx >= 0
        ? sheet.equipment.map((e, i) => (i === idx ? equip : e))
        : [...sheet.equipment, equip];
    this.commitSheet(equip.character_id, sheet);
  }

  removeEquippedItem(id: string, characterId: string): void {
    const sheet = this.snapshot.sheets[characterId];
    if (!sheet) return;
    this.commitSheet(characterId, {
      ...sheet,
      equipment: sheet.equipment.filter((e) => e.id !== id),
    });
  }

  // ── Abilities ───────────────────────────────────────────────────────

  upsertAbility(ability: Ability): void {
    const sheet = this.getOrCreateSheet(ability.character_id);
    const idx = sheet.abilities.findIndex((a) => a.id === ability.id);
    sheet.abilities =
      idx >= 0
        ? sheet.abilities.map((a, i) => (i === idx ? ability : a))
        : [...sheet.abilities, ability];
    this.commitSheet(ability.character_id, sheet);
  }

  removeAbility(id: string, characterId: string): void {
    const sheet = this.snapshot.sheets[characterId];
    if (!sheet) return;
    this.commitSheet(characterId, {
      ...sheet,
      abilities: sheet.abilities.filter((a) => a.id !== id),
    });
  }

  // ── Spells ──────────────────────────────────────────────────────────

  upsertSpell(spell: Spell): void {
    const sheet = this.getOrCreateSheet(spell.character_id);
    const idx = sheet.spells.findIndex((sp) => sp.id === spell.id);
    sheet.spells =
      idx >= 0
        ? sheet.spells.map((sp, i) => (i === idx ? spell : sp))
        : [...sheet.spells, spell];
    this.commitSheet(spell.character_id, sheet);
  }

  removeSpell(id: string, characterId: string): void {
    const sheet = this.snapshot.sheets[characterId];
    if (!sheet) return;
    this.commitSheet(characterId, {
      ...sheet,
      spells: sheet.spells.filter((sp) => sp.id !== id),
    });
  }

  // ── Buffs ───────────────────────────────────────────────────────────

  upsertBuff(buff: Buff): void {
    const sheet = this.getOrCreateSheet(buff.character_id);
    const idx = sheet.buffs.findIndex((b) => b.id === buff.id);
    sheet.buffs =
      idx >= 0
        ? sheet.buffs.map((b, i) => (i === idx ? buff : b))
        : [...sheet.buffs, buff];
    this.commitSheet(buff.character_id, sheet);
  }

  removeBuff(id: string, characterId: string): void {
    const sheet = this.snapshot.sheets[characterId];
    if (!sheet) return;
    this.commitSheet(characterId, {
      ...sheet,
      buffs: sheet.buffs.filter((b) => b.id !== id),
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private getOrCreateSheet(characterId: string): CharacterSheet {
    const s = this.snapshot;
    if (s.sheets[characterId]) return { ...s.sheets[characterId] };
    const character = s.characters.find((c) => c.id === characterId);
    return {
      character: character!,
      skills: [],
      items: [],
      equipment: [],
      abilities: [],
      spells: [],
      buffs: [],
    };
  }

  private commitSheet(characterId: string, sheet: CharacterSheet): void {
    const s = this.snapshot;
    this.patch({
      sheets: { ...s.sheets, [characterId]: sheet },
    });
  }
}
