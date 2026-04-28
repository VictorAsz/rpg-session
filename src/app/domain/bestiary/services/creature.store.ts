import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '../../base/store';
import type { Creature, CreatureAbility } from '../../../shared/models/bestiary-models';

export interface BestiaryState {
  creatures: Creature[];
  abilities: Record<string, CreatureAbility[]>;
  isLoading: boolean;
  error: string | null;
}

const INIT: BestiaryState = {
  creatures: [],
  abilities: {},
  isLoading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class CreatureStore extends Store<BestiaryState> {
  constructor() { super(INIT); }

  readonly creatures$: Observable<Creature[]> = this.select(s => s.creatures);
  readonly isLoading$ = this.select(s => s.isLoading);
  readonly error$ = this.select(s => s.error);

  upsertCreature(c: Creature): void {
    const creatures = this.upsertArr(this.snapshot.creatures, c);
    this.patch({ creatures });
  }

  removeCreature(id: string): void {
    this.patch({ creatures: this.snapshot.creatures.filter(c => c.id !== id) });
  }

  setCreatureAbilities(creatureId: string, abilities: CreatureAbility[]): void {
    this.patch({ abilities: { ...this.snapshot.abilities, [creatureId]: abilities } });
  }

  addCreatureAbility(ca: CreatureAbility): void {
    const current = this.snapshot.abilities[ca.creature_id] ?? [];
    if (current.some(a => a.id === ca.id)) return; // idempotent
    this.patch({ abilities: { ...this.snapshot.abilities, [ca.creature_id]: [...current, ca] } });
  }

  removeCreatureAbility(creatureId: string, id: string): void {
    const current = (this.snapshot.abilities[creatureId] ?? []).filter(a => a.id !== id);
    this.patch({ abilities: { ...this.snapshot.abilities, [creatureId]: current } });
  }

  private upsertArr<T extends { id: string }>(arr: T[], e: T): T[] {
    const i = arr.findIndex(x => x.id === e.id);
    return i >= 0 ? arr.map((x, n) => n === i ? e : x) : [...arr, e];
  }
}
