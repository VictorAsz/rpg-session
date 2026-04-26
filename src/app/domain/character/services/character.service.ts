import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupabaseService } from '../../../core/services/supabase.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import type { RealtimeEvent } from '../../../shared/models/realtime-event.model';
import type {
  Character,
  Skill,
  Item,
  EquippedItem,
  Ability,
  Spell,
  Buff,
} from '../../../shared/models/rpg-models';
import { CharacterStore } from './character.store';

@Injectable({ providedIn: 'root' })
export class CharacterService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly realtime: RealtimeService,
    private readonly store: CharacterStore,
  ) {}

  // ── Initial Load ────────────────────────────────────────────────────

  async loadAllCharacters(): Promise<void> {
    this.store.patch({ isLoading: true, error: null });
    try {
      const characters = await this.supabase.fetchAll<Character>('characters');
      this.store.patch({ characters, isLoading: false });
      await Promise.all(characters.map((c) => this.loadSheetData(c.id)));
    } catch (err) {
      this.store.patch({ isLoading: false, error: 'Falha ao carregar personagens' });
    }
  }

  private async loadSheetData(characterId: string): Promise<void> {
    try {
      const [skills, items, equippedItems, abilities, spells, buffs] = await Promise.all([
        this.supabase.fetchAll<Skill>('skills', { column: 'character_id', value: characterId }),
        this.supabase.fetchAll<Item>('items', { column: 'character_id', value: characterId }),
        this.supabase.fetchAll<EquippedItem>('equipped_items', { column: 'character_id', value: characterId }),
        this.supabase.fetchAll<Ability>('abilities', { column: 'character_id', value: characterId }),
        this.supabase.fetchAll<Spell>('spells', { column: 'character_id', value: characterId }),
        this.supabase.fetchAll<Buff>('buffs', { column: 'character_id', value: characterId }),
      ]);

      const s = this.store.snapshot;
      const character = s.characters.find((c) => c.id === characterId);
      if (!character) return;

      this.store.patch({
        sheets: {
          ...s.sheets,
          [characterId]: { character, skills, items, equipment: equippedItems, abilities, spells, buffs },
        },
      });
    } catch {}
  }

  // ── Realtime Subscriptions ─────────────────────────────────────────

  subscribeToRealtime(): void {
    this.realtime
      .onChanges<Character>('characters', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.handleRemoteChange(e, 'character'));

    this.realtime
      .onChanges<Skill>('skills', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.handleRemoteChange(e, 'skill'));

    this.realtime
      .onChanges<Item>('items', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.handleRemoteChange(e, 'item'));

    this.realtime
      .onChanges<EquippedItem>('equipped_items', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.handleRemoteChange(e, 'equippedItem'));

    this.realtime
      .onChanges<Ability>('abilities', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.handleRemoteChange(e, 'ability'));

    this.realtime
      .onChanges<Spell>('spells', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.handleRemoteChange(e, 'spell'));

    this.realtime
      .onChanges<Buff>('buffs', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => this.handleRemoteChange(e, 'buff'));
  }

  // ── Remote Change Router ───────────────────────────────────────────

  private handleRemoteChange(
    event: RealtimeEvent<unknown>,
    entity: 'character' | 'skill' | 'item' | 'equippedItem' | 'ability' | 'spell' | 'buff',
  ): void {
    if (event.event === 'DELETE') {
      this.applyDeletion(event, entity);
    } else {
      this.applyUpsert(event, entity);
    }
  }

  private applyUpsert(
    event: RealtimeEvent<unknown>,
    entity: string,
  ): void {
    const payload = event.new;
    if (!payload) return;

    switch (entity) {
      case 'character':
        return this.store.upsertCharacter(payload as Character);
      case 'skill':
        return this.store.upsertSkill(payload as Skill);
      case 'item':
        return this.store.upsertItem(payload as Item);
      case 'equippedItem':
        return this.store.upsertEquippedItem(payload as EquippedItem);
      case 'ability':
        return this.store.upsertAbility(payload as Ability);
      case 'spell':
        return this.store.upsertSpell(payload as Spell);
      case 'buff':
        return this.store.upsertBuff(payload as Buff);
    }
  }

  private applyDeletion(
    event: RealtimeEvent<unknown>,
    entity: string,
  ): void {
    const payload = event.old;
    if (!payload) return;

    const record = payload as Record<string, string>;
    const id = record['id'];
    const characterId = record['character_id'];

    switch (entity) {
      case 'character':
        return this.store.removeCharacter(id);
      case 'skill':
        return this.store.removeSkill(id, characterId);
      case 'item':
        return this.store.removeItem(id, characterId);
      case 'equippedItem':
        return this.store.removeEquippedItem(id, characterId);
      case 'ability':
        return this.store.removeAbility(id, characterId);
      case 'spell':
        return this.store.removeSpell(id, characterId);
      case 'buff':
        return this.store.removeBuff(id, characterId);
    }
  }

  // ── Write Operations (local → Supabase → store) ────────────────────

  async updateCharacter(id: string, changes: Partial<Character>): Promise<void> {
    const updated = await this.supabase.update<Character>('characters', id, changes);
    this.store.upsertCharacter(updated);
  }

  async createCharacter(payload: Omit<Character, 'id' | 'created_at' | 'updated_at'>): Promise<Character> {
    const created = await this.supabase.insert<Character>('characters', payload);
    this.store.upsertCharacter(created);
    return created;
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.supabase.delete('characters', id);
    this.store.removeCharacter(id);
  }

  async addSkill(payload: Omit<Skill, 'id' | 'created_at'>): Promise<void> {
    const created = await this.supabase.insert<Skill>('skills', payload);
    this.store.upsertSkill(created);
  }

  async updateSkill(id: string, changes: Partial<Skill>): Promise<void> {
    const updated = await this.supabase.update<Skill>('skills', id, changes);
    this.store.upsertSkill(updated);
  }

  async deleteSkill(id: string, characterId: string): Promise<void> {
    await this.supabase.delete('skills', id);
    this.store.removeSkill(id, characterId);
  }

  async addItem(payload: Omit<Item, 'id' | 'created_at'>): Promise<void> {
    const created = await this.supabase.insert<Item>('items', payload);
    this.store.upsertItem(created);
  }

  async updateItem(id: string, changes: Partial<Item>): Promise<void> {
    const updated = await this.supabase.update<Item>('items', id, changes);
    this.store.upsertItem(updated);
  }

  async deleteItem(id: string, characterId: string): Promise<void> {
    await this.supabase.delete('items', id);
    this.store.removeItem(id, characterId);
  }

  async equipItem(
    characterId: string,
    itemId: string,
    slot: EquippedItem['slot'],
  ): Promise<void> {
    const created = await this.supabase.insert<EquippedItem>('equipped_items', {
      character_id: characterId,
      item_id: itemId,
      slot,
    } as Partial<EquippedItem>);
    this.store.upsertEquippedItem(created);
  }

  async unequipItem(equippedId: string, characterId: string): Promise<void> {
    await this.supabase.delete('equipped_items', equippedId);
    this.store.removeEquippedItem(equippedId, characterId);
  }

  async addAbility(payload: Omit<Ability, 'id' | 'created_at'>): Promise<void> {
    const created = await this.supabase.insert<Ability>('abilities', payload);
    this.store.upsertAbility(created);
  }

  async updateAbility(id: string, changes: Partial<Ability>): Promise<void> {
    const updated = await this.supabase.update<Ability>('abilities', id, changes);
    this.store.upsertAbility(updated);
  }

  async deleteAbility(id: string, characterId: string): Promise<void> {
    await this.supabase.delete('abilities', id);
    this.store.removeAbility(id, characterId);
  }

  async addSpell(payload: Omit<Spell, 'id' | 'created_at'>): Promise<void> {
    const created = await this.supabase.insert<Spell>('spells', payload);
    this.store.upsertSpell(created);
  }

  async updateSpell(id: string, changes: Partial<Spell>): Promise<void> {
    const updated = await this.supabase.update<Spell>('spells', id, changes);
    this.store.upsertSpell(updated);
  }

  async deleteSpell(id: string, characterId: string): Promise<void> {
    await this.supabase.delete('spells', id);
    this.store.removeSpell(id, characterId);
  }

  async addBuff(payload: Omit<Buff, 'id' | 'created_at'>): Promise<void> {
    const created = await this.supabase.insert<Buff>('buffs', payload);
    this.store.upsertBuff(created);
  }

  async updateBuff(id: string, changes: Partial<Buff>): Promise<void> {
    const updated = await this.supabase.update<Buff>('buffs', id, changes);
    this.store.upsertBuff(updated);
  }

  async deleteBuff(id: string, characterId: string): Promise<void> {
    await this.supabase.delete('buffs', id);
    this.store.removeBuff(id, characterId);
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.store.destroy();
  }
}
