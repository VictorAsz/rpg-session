import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { DiceService } from '../../domain/dice/services/dice.service';
import { DiceStore } from '../../domain/dice/services/dice.store';
import { CharacterStore } from '../../domain/character/services/character.store';
import { CharacterService } from '../../domain/character/services/character.service';
import type { Character } from '../../shared/models/rpg-models';

interface InitiativeEntry {
  characterId: string;
  name: string;
  roll: number;
}

@Component({
  selector: 'app-stage',
  imports: [ReactiveFormsModule, AsyncPipe, RouterLink],
  templateUrl: './stage.component.html',
  styleUrls: ['./stage.component.scss'],
})
export class StageComponent {
  readonly auth = inject(AuthService);
  private readonly diceService = inject(DiceService);
  private readonly diceStore = inject(DiceStore);
  private readonly characterStore = inject(CharacterStore);
  private readonly characterService = inject(CharacterService);
  private readonly fb = inject(FormBuilder);

  readonly sidebarOpen = signal(true);
  readonly characters$ = this.characterStore.characters$;
  readonly latestRoll$ = this.diceStore.latestRoll$;

  readonly initiative = signal<InitiativeEntry[]>([]);
  readonly currentTurnIndex = signal(0);
  readonly rolling = signal(false);
  readonly lastResult = signal<{ notation: string; result: number } | null>(null);

  readonly addInitCharacter = signal<string | null>(null);

  readonly customRoll = this.fb.group({
    notation: ['1d20', [Validators.required, Validators.pattern(/^\d+d\d+(\s*[+-]\d+)*$/)]],
  });

  readonly dicePresets = [
    { label: 'D4', notation: '1d4', color: '#7c4dff' },
    { label: 'D6', notation: '1d6', color: '#448aff' },
    { label: 'D8', notation: '1d8', color: '#69f0ae' },
    { label: 'D10', notation: '1d10', color: '#ff9100' },
    { label: 'D12', notation: '1d12', color: '#ff5252' },
    { label: 'D20', notation: '1d20', color: '#e94560' },
    { label: 'D100', notation: '1d100', color: '#ffd740' },
  ];

  readonly currentCharacter = computed<Character | null>(() => {
    const idx = this.currentTurnIndex();
    const list = this.initiative();
    if (list.length === 0 || idx >= list.length) return null;
    const cid = list[idx].characterId;
    return this.characterStore.snapshot.characters.find(c => c.id === cid) ?? null;
  });

  constructor() {
    this.characterService.loadAllCharacters();
  }

  toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  async rollDice(notation: string): Promise<void> {
    this.rolling.set(true);
    const userId = this.auth.currentUserId()!;
    const char = this.currentCharacter();
    const result = await this.diceService.roll(notation, userId, char?.id);
    this.lastResult.set({ notation, result: result.result });
    this.rolling.set(false);

    setTimeout(() => this.lastResult.set(null), 3000);
  }

  async rollCustom(): Promise<void> {
    if (this.customRoll.invalid) return;
    const notation = this.customRoll.getRawValue().notation!;
    await this.rollDice(notation);
    this.customRoll.reset({ notation: '1d20' });
  }

  addToInitiative(character: Character): void {
    const list = this.initiative();
    if (list.some(e => e.characterId === character.id)) return;

    const dexMod = Math.floor((character.dexterity - 10) / 2);
    const roll = Math.floor(Math.random() * 20) + 1 + dexMod;

    this.initiative.set([...list, {
      characterId: character.id,
      name: character.name,
      roll,
    }]);
    this.addInitCharacter.set(null);
  }

  removeFromInitiative(characterId: string): void {
    this.initiative.set(this.initiative().filter(e => e.characterId !== characterId));
    if (this.currentTurnIndex() >= this.initiative().length) {
      this.currentTurnIndex.set(0);
    }
  }

  sortInitiative(): void {
    this.initiative.set(
      [...this.initiative()].sort((a, b) => b.roll - a.roll),
    );
    this.currentTurnIndex.set(0);
  }

  nextTurn(): void {
    const len = this.initiative().length;
    if (len === 0) return;
    this.currentTurnIndex.set((this.currentTurnIndex() + 1) % len);
  }

  prevTurn(): void {
    const len = this.initiative().length;
    if (len === 0) return;
    this.currentTurnIndex.set((this.currentTurnIndex() - 1 + len) % len);
  }

  clearInitiative(): void {
    this.initiative.set([]);
    this.currentTurnIndex.set(0);
  }
}
