import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '../../base/store';
import type { DiceRoll } from '../../../shared/models/rpg-models';
import type { DiceState } from '../../../shared/models/dice-state.model';

@Injectable({ providedIn: 'root' })
export class DiceStore extends Store<DiceState> {
  override get initialState(): DiceState {
    return {
      rolls: [],
      maxRolls: 200,
      isLoading: false,
      error: null,
    };
  }

  readonly rolls$: Observable<DiceRoll[]> = this.select((s) => s.rolls);
  readonly latestRoll$: Observable<DiceRoll | undefined> = this.select(
    (s) => s.rolls[s.rolls.length - 1],
  );
  readonly isLoading$: Observable<boolean> = this.select((s) => s.isLoading);
  readonly error$: Observable<string | null> = this.select((s) => s.error);

  addRoll(roll: DiceRoll): void {
    const s = this.snapshot;
    const rolls = [...s.rolls, roll].slice(-s.maxRolls);
    this.patch({ rolls });
  }
}
