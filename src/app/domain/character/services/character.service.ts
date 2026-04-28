import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupabaseService } from '../../../core/services/supabase.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import type { RealtimeEvent } from '../../../shared/models/realtime-event.model';
import type {
  Character, Skill, Item, EquippedItem, Ability, Spell, Buff,
  CharacterItem, CharacterSpell, CharacterAbility, ItemCatalog, SpellCatalog, AbilityCatalog,
} from '../../../shared/models/rpg-models';
import { CharacterStore } from './character.store';

@Injectable({ providedIn: 'root' })
export class CharacterService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly realtime = inject(RealtimeService);
  private readonly store = inject(CharacterStore);
  private readonly destroy$ = new Subject<void>();
  private readonly client = this.supabase.client;

  async loadAllCharacters(): Promise<void> {
    this.store.patch({ isLoading: true, error: null });
    try {
      const characters = await this.supabase.fetchAll<Character>('characters');
      this.store.patch({ characters, isLoading: false });
      await Promise.all(characters.map((c) => this.loadSheetData(c.id)));
    } catch {
      this.store.patch({ isLoading: false, error: 'Falha ao carregar personagens' });
    }
  }

  private async loadSheetData(characterId: string): Promise<void> {
    try {
      const [skills, equippedItems, buffs, ci, cs, ca] = await Promise.all([
        this.supabase.fetchAll<Skill>('skills', { column: 'character_id', value: characterId }),
        this.supabase.fetchAll<EquippedItem>('equipped_items', { column: 'character_id', value: characterId }),
        this.supabase.fetchAll<Buff>('buffs', { column: 'character_id', value: characterId }),
        this.supabase.fetchAll<CharacterItem>('character_items', { column: 'character_id', value: characterId }),
        this.supabase.fetchAll<CharacterSpell>('character_spells', { column: 'character_id', value: characterId }),
        this.supabase.fetchAll<CharacterAbility>('character_abilities', { column: 'character_id', value: characterId }),
      ]);

      // Join catalog data → map to legacy shapes
      const items: Item[] = await this.resolveItems(ci);
      const spells: Spell[] = await this.resolveSpells(cs);
      const abilities: Ability[] = await this.resolveAbilities(ca);

      const s = this.store.snapshot;
      const character = s.characters.find((c) => c.id === characterId);
      if (!character) return;

      this.store.patch({
        sheets: { ...s.sheets, [characterId]: { character, skills, items, equipment: equippedItems, abilities, spells, buffs } },
      });
    } catch {}
  }

  private async resolveItems(ci: CharacterItem[]): Promise<Item[]> {
    if (ci.length === 0) return [];
    const ids = ci.map(i => i.catalog_id);
    const { data } = await this.client.from('items_catalog').select('*').in('id', ids);
    const catalog = (data ?? []) as ItemCatalog[];
    return ci.map(row => {
      const cat = catalog.find(c => c.id === row.catalog_id);
      return {
        id: row.id, character_id: row.character_id, name: cat?.name ?? '???',
        description: cat?.description ?? '', quantity: row.quantity,
        effect: cat?.effect ?? { type: 'custom', formula: '' },
        created_at: row.created_at,
      } as Item;
    });
  }

  private async resolveSpells(cs: CharacterSpell[]): Promise<Spell[]> {
    if (cs.length === 0) return [];
    const ids = cs.map(s => s.catalog_id);
    const { data } = await this.client.from('spells_catalog').select('*').in('id', ids);
    const catalog = (data ?? []) as SpellCatalog[];
    return cs.map(row => {
      const cat = catalog.find(c => c.id === row.catalog_id);
      return {
        id: row.id, character_id: row.character_id, name: cat?.name ?? '???',
        description: cat?.description ?? '', mana_cost: cat?.mana_cost ?? 0,
        effect: cat?.effect ?? { type: 'custom', formula: '' },
        created_at: row.created_at,
      } as Spell;
    });
  }

  private async resolveAbilities(ca: CharacterAbility[]): Promise<Ability[]> {
    if (ca.length === 0) return [];
    const ids = ca.map(a => a.catalog_id);
    const { data } = await this.client.from('abilities_catalog').select('*').in('id', ids);
    const catalog = (data ?? []) as AbilityCatalog[];
    return ca.map(row => {
      const cat = catalog.find(c => c.id === row.catalog_id);
      return {
        id: row.id, character_id: row.character_id, name: cat?.name ?? '???',
        description: cat?.description ?? '',
        effect: cat?.effect ?? { type: 'custom', formula: '' },
        created_at: row.created_at,
      } as Ability;
    });
  }

  // ── Realtime ─────────────────────────────────────────────────────────

  subscribeToRealtime(): void {
    this.realtime.onChanges<Character>('characters', '*').pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e.event === 'DELETE') this.store.removeCharacter((e.old as any)['id']);
      else if (e.new) this.store.upsertCharacter(e.new as Character);
    });
    this.realtime.onChanges<Skill>('skills', '*').pipe(takeUntil(this.destroy$)).subscribe(e => this.handleRemote(e, 'skill'));
    this.realtime.onChanges<EquippedItem>('equipped_items', '*').pipe(takeUntil(this.destroy$)).subscribe(e => this.handleRemote(e, 'equippedItem'));
    this.realtime.onChanges<Buff>('buffs', '*').pipe(takeUntil(this.destroy$)).subscribe(e => this.handleRemote(e, 'buff'));
    this.realtime.onChanges<CharacterItem>('character_items', '*').pipe(takeUntil(this.destroy$)).subscribe(e => this.handleJunction(e, 'item'));
    this.realtime.onChanges<CharacterSpell>('character_spells', '*').pipe(takeUntil(this.destroy$)).subscribe(e => this.handleJunction(e, 'spell'));
    this.realtime.onChanges<CharacterAbility>('character_abilities', '*').pipe(takeUntil(this.destroy$)).subscribe(e => this.handleJunction(e, 'ability'));
  }

  private handleRemote(e: RealtimeEvent<unknown>, entity: string): void {
    if (e.event === 'DELETE') {
      const r = e.old as Record<string, string>;
      const id = r['id'], cid = r['character_id'];
      const fn = { skill: 'removeSkill', equippedItem: 'removeEquippedItem', buff: 'removeBuff' }[entity];
      if (fn) (this.store as any)[fn](id, cid);
    } else if (e.new) {
      const fn = { skill: 'upsertSkill', equippedItem: 'upsertEquippedItem', buff: 'upsertBuff' }[entity];
      if (fn) (this.store as any)[fn](e.new);
    }
  }

  private handleJunction(e: RealtimeEvent<unknown>, entity: string): void {
    if (!e.new && !e.old) return;
    const record = (e.new ?? e.old) as Record<string, string>;
    const characterId = record['character_id'];
    if (!characterId) return;
    // Reload sheet for this character
    this.loadSheetData(characterId);
  }

  // ── CRUD: Items ──────────────────────────────────────────────────────

  async addItem(data: Partial<Item>): Promise<void> {
    if (!data.character_id) return;
    // Ensure item exists in catalog
    const { data: existing } = await this.client.from('items_catalog').select('id').eq('name', data.name).maybeSingle();
    let catalogId: string;
    if (existing) {
      catalogId = existing['id'];
    } else {
      const { data: created } = await this.client.from('items_catalog').insert({
        name: data.name, description: data.description ?? '',
        effect: data.effect ?? {}, value: 0, is_usable: false,
      }).select('id').single();
      catalogId = created?.['id'] ?? '';
    }
    if (!catalogId) return;
    await this.client.from('character_items').insert({
      character_id: data.character_id, catalog_id: catalogId, quantity: data.quantity ?? 1,
    });
    await this.loadSheetData(data.character_id);
  }

  async updateItem(id: string, data: Partial<Item>): Promise<void> {
    await this.client.from('character_items').update({ quantity: data.quantity }).eq('id', id);
    await this.refreshSheetByItemId(id);
  }

  async deleteItem(id: string, characterId: string): Promise<void> {
    await this.client.from('character_items').delete().eq('id', id);
    this.store.removeItem(id, characterId);
  }

  // ── CRUD: Spells ─────────────────────────────────────────────────────

  async addSpell(data: Partial<Spell>): Promise<void> {
    if (!data.character_id) return;
    const { data: existing } = await this.client.from('spells_catalog').select('id').eq('name', data.name).maybeSingle();
    let catalogId: string;
    if (existing) {
      catalogId = existing['id'];
    } else {
      const { data: created } = await this.client.from('spells_catalog').insert({
        name: data.name, description: data.description ?? '', mana_cost: data.mana_cost ?? 0,
        effect: data.effect ?? {}, type_cast: 'conjuracao', is_visible: true,
      }).select('id').single();
      catalogId = created?.['id'] ?? '';
    }
    if (!catalogId) return;
    await this.client.from('character_spells').insert({ character_id: data.character_id, catalog_id: catalogId });
    await this.loadSheetData(data.character_id);
  }

  async updateSpell(id: string, data: Partial<Spell>): Promise<void> {
    await this.client.from('spells_catalog').update({
      name: data.name, description: data.description, mana_cost: data.mana_cost,
    }).eq('id', id);
    await this.refreshSheetBySpellId(id);
  }

  async deleteSpell(id: string, characterId: string): Promise<void> {
    await this.client.from('character_spells').delete().eq('id', id);
    this.store.removeSpell(id, characterId);
  }

  // ── CRUD: Abilities ──────────────────────────────────────────────────

  async addAbility(data: Partial<Ability>): Promise<void> {
    if (!data.character_id) return;
    const { data: existing } = await this.client.from('abilities_catalog').select('id').eq('name', data.name).maybeSingle();
    let catalogId: string;
    if (existing) {
      catalogId = existing['id'];
    } else {
      const { data: created } = await this.client.from('abilities_catalog').insert({
        name: data.name, description: data.description ?? '',
        effect: data.effect ?? {}, ability_type: 'ativa', is_visible: true,
      }).select('id').single();
      catalogId = created?.['id'] ?? '';
    }
    if (!catalogId) return;
    await this.client.from('character_abilities').insert({ character_id: data.character_id, catalog_id: catalogId });
    await this.loadSheetData(data.character_id);
  }

  async updateAbility(id: string, data: Partial<Ability>): Promise<void> {
    await this.client.from('abilities_catalog').update({
      name: data.name, description: data.description,
    }).eq('id', id);
    await this.refreshSheetByAbilityId(id);
  }

  async deleteAbility(id: string, characterId: string): Promise<void> {
    await this.client.from('character_abilities').delete().eq('id', id);
    this.store.removeAbility(id, characterId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async refreshSheetByItemId(id: string): Promise<void> {
    const { data } = await this.client.from('character_items').select('character_id').eq('id', id).single();
    if (data) await this.loadSheetData(data['character_id']);
  }

  private async refreshSheetBySpellId(id: string): Promise<void> {
    const { data } = await this.client.from('character_spells').select('character_id').eq('id', id).single();
    if (data) await this.loadSheetData(data['character_id']);
  }

  private async refreshSheetByAbilityId(id: string): Promise<void> {
    const { data } = await this.client.from('character_abilities').select('character_id').eq('id', id).single();
    if (data) await this.loadSheetData(data['character_id']);
  }

  // ── Unchanged CRUD ───────────────────────────────────────────────────

  async createCharacter(data: Partial<Character>): Promise<Character> { const c = await this.supabase.insert<Character>('characters', data); this.store.upsertCharacter(c); return c; }
  async updateCharacter(id: string, data: Partial<Character>): Promise<void> { const c = await this.supabase.update<Character>('characters', id, data); this.store.upsertCharacter(c); }
  async deleteCharacter(id: string): Promise<void> { await this.supabase.delete('characters', id); this.store.removeCharacter(id); }
  async addSkill(data: Partial<Skill>): Promise<void> { const c = await this.supabase.insert<Skill>('skills', data); this.store.upsertSkill(c); }
  async updateSkill(id: string, data: Partial<Skill>): Promise<void> { const c = await this.supabase.update<Skill>('skills', id, data); this.store.upsertSkill(c); }
  async deleteSkill(id: string, characterId: string): Promise<void> { await this.supabase.delete('skills', id); this.store.removeSkill(id, characterId); }
  async equipItem(characterId: string, itemId: string, slot: EquippedItem['slot']): Promise<void> { const c = await this.supabase.insert<EquippedItem>('equipped_items', { character_id: characterId, item_id: itemId, slot } as any); this.store.upsertEquippedItem(c); }
  async unequipItem(id: string, characterId: string): Promise<void> { await this.supabase.delete('equipped_items', id); this.store.removeEquippedItem(id, characterId); }
  async addBuff(data: Partial<Buff>): Promise<void> { const c = await this.supabase.insert<Buff>('buffs', data); this.store.upsertBuff(c); }
  async deleteBuff(id: string, characterId: string): Promise<void> { await this.supabase.delete('buffs', id); this.store.removeBuff(id, characterId); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
