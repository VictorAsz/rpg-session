import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '../../base/store';
import type { SpellCatalog, AbilityCatalog, ItemCatalog } from '../../../shared/models/rpg-models';

export interface CatalogState {
  spells: SpellCatalog[];
  abilities: AbilityCatalog[];
  items: ItemCatalog[];
  isLoading: boolean;
  error: string | null;
}

const INITIAL_STATE: CatalogState = {
  spells: [],
  abilities: [],
  items: [],
  isLoading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class CatalogStore extends Store<CatalogState> {
  constructor() { super(INITIAL_STATE); }

  readonly spells$: Observable<SpellCatalog[]> = this.select(s => s.spells);
  readonly abilities$: Observable<AbilityCatalog[]> = this.select(s => s.abilities);
  readonly items$: Observable<ItemCatalog[]> = this.select(s => s.items);
  readonly isLoading$: Observable<boolean> = this.select(s => s.isLoading);
  readonly error$: Observable<string | null> = this.select(s => s.error);

  upsertSpell(spell: SpellCatalog): void {
    const spells = this.upsertInArray(this.snapshot.spells, spell);
    this.patch({ spells });
  }

  removeSpell(id: string): void {
    this.patch({ spells: this.snapshot.spells.filter(sp => sp.id !== id) });
  }

  upsertAbility(ability: AbilityCatalog): void {
    const abilities = this.upsertInArray(this.snapshot.abilities, ability);
    this.patch({ abilities });
  }

  removeAbility(id: string): void {
    this.patch({ abilities: this.snapshot.abilities.filter(a => a.id !== id) });
  }

  upsertItem(item: ItemCatalog): void {
    const items = this.upsertInArray(this.snapshot.items, item);
    this.patch({ items });
  }

  removeItem(id: string): void {
    this.patch({ items: this.snapshot.items.filter(it => it.id !== id) });
  }

  private upsertInArray<T extends { id: string }>(arr: T[], entity: T): T[] {
    const idx = arr.findIndex(e => e.id === entity.id);
    return idx >= 0 ? arr.map((e, i) => i === idx ? entity : e) : [...arr, entity];
  }
}
