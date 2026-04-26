import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupabaseService } from '../../../core/services/supabase.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { CharacterStore } from '../../../domain/character/services/character.store';
import type { RealtimeEvent } from '../../../shared/models/realtime-event.model';
import type { DiceRoll, DiceRollDetails, Character } from '../../../shared/models/rpg-models';
import { DiceStore } from './dice.store';

const ATTR_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS'] as const;
type AttrKey = (typeof ATTR_KEYS)[number];

const ATTR_MOD_KEYS = ['STR_MOD', 'DEX_MOD', 'CON_MOD', 'INT_MOD', 'WIS_MOD'] as const;
type AttrModKey = (typeof ATTR_MOD_KEYS)[number];

@Injectable({ providedIn: 'root' })
export class DiceService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly realtime = inject(RealtimeService);
  private readonly store = inject(DiceStore);
  private readonly characterStore = inject(CharacterStore);
  private readonly destroy$ = new Subject<void>();

  async loadRecentRolls(limit = 50): Promise<void> {
    this.store.patch({ isLoading: true, error: null });
    try {
      const rolls = await this.supabase.fetchAll<DiceRoll>('dice_rolls');
      this.store.patch({ rolls: rolls.slice(-limit), isLoading: false });
    } catch {
      this.store.patch({ isLoading: false, error: 'Falha ao carregar rolagens' });
    }
  }

  subscribeToRealtime(): void {
    this.realtime
      .onChanges<DiceRoll>('dice_rolls', 'INSERT')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => {
        if (e.new) this.store.addRoll(e.new as DiceRoll);
      });

    this.realtime
      .onBroadcast<DiceRollBroadcast>('dice:rolled')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.debug('[dice:broadcast]', data);
      });
  }

  // ── Public API ──────────────────────────────────────────────────────

  async roll(
    notation: string,
    rollerUserId: string,
    characterId?: string,
  ): Promise<DiceRoll> {
    const char = characterId
      ? this.characterStore.snapshot.sheets[characterId]?.character ?? null
      : null;

    const { total, details } = this.evaluate(notation, char);

    let saved = await this.tryInsert({
      roller_user_id: rollerUserId,
      character_id: characterId ?? null,
      notation,
      result: total,
      details,
    });

    // fallback: se a coluna 'details' ainda nao existe, insere sem ela
    if (!saved) {
      saved = await this.supabase.insert<DiceRoll>('dice_rolls', {
        roller_user_id: rollerUserId,
        character_id: characterId ?? null,
        notation,
        result: total,
      } as Partial<DiceRoll>);
    }

    this.store.addRoll(saved);

    this.realtime.broadcast<DiceRollBroadcast>('dice:rolled', {
      notation,
      result: total,
      details,
      rollerUserId,
      characterId: characterId ?? null,
    });

    return saved;
  }

  // ── Parser ──────────────────────────────────────────────────────────

  private async tryInsert(payload: Partial<DiceRoll>): Promise<DiceRoll | null> {
    try {
      return await this.supabase.insert<DiceRoll>('dice_rolls', payload);
    } catch {
      return null;
    }
  }

  evaluate(notation: string, char?: Character | null): {
    total: number;
    details: DiceRollDetails;
  } {
    const details: DiceRollDetails = {
      dice: [],
      attributeMods: {},
      constantMod: 0,
    };

    let expression = notation.replace(/\s+/g, '');

    // Resolve placeholders de atributos (substitui STR_MOD → número, etc.)
    const resolved = this.resolveAttributes(expression, char, details);
    expression = resolved;

    // Processa dados: NdX
    const diceRegex = /(\d+)d(\d+)/gi;
    let match: RegExpExecArray | null;
    let total = 0;

    while ((match = diceRegex.exec(expression)) !== null) {
      const count = parseInt(match[1], 10);
      const sides = parseInt(match[2], 10);
      const results: number[] = [];

      for (let i = 0; i < count; i++) {
        results.push(Math.floor(Math.random() * sides) + 1);
      }

      details.dice.push({ count, sides, results });
      total += results.reduce((a, b) => a + b, 0);
    }

    // Remove partes já processadas
    let remainder = expression.replace(diceRegex, '');

    // Soma os modificadores restantes (constantes e atributos já resolvidos)
    const numberRegex = /[+-]?\d+/g;
    while ((match = numberRegex.exec(remainder)) !== null) {
      total += parseInt(match[0], 10);
    }

    details.constantMod = total - details.dice.reduce((s, d) => s + d.results.reduce((a, b) => a + b, 0), 0)
      - Object.values(details.attributeMods).reduce((a, b) => a + b, 0);

    return { total, details };
  }

  private resolveAttributes(
    expression: string,
    char: Character | null | undefined,
    details: DiceRollDetails,
  ): string {
    let result = expression;

    for (const key of ATTR_MOD_KEYS) {
      const attr = key.slice(0, 3) as AttrKey;
      const mod = char ? this.mod(char[attr.toLowerCase() as keyof Character] as number) : 0;
      if (expression.includes(key)) {
        details.attributeMods[key] = mod;
        result = result.replace(new RegExp(key, 'g'), mod >= 0 ? `+${mod}` : `${mod}`);
      }
    }

    for (const key of ATTR_KEYS) {
      if (expression.includes(key)) {
        const val = char ? (char[key.toLowerCase() as keyof Character] as number) : 0;
        details.attributeMods[key] = val;
        result = result.replace(new RegExp(key, 'g'), val >= 0 ? `+${val}` : `${val}`);
      }
    }

    return result;
  }

  mod(value: number): number {
    return Math.floor((value - 10) / 2);
  }

  buildFormula(baseDice: string, char?: Character | null): string {
    if (!char) return baseDice;

    // Detecta qual atributo usar baseado no contexto (ex: "1d20" → "1d20 + STR_MOD")
    const lower = baseDice.toLowerCase();
    if (lower.includes('d20')) return `${baseDice} + STR_MOD`;
    if (lower.includes('d6') || lower.includes('d8')) return `${baseDice} + DEX_MOD`;
    return baseDice;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

export interface DiceRollBroadcast {
  notation: string;
  result: number;
  details: DiceRollDetails;
  rollerUserId: string;
  characterId: string | null;
}
