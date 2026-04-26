import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupabaseService } from '../../../core/services/supabase.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import type { DiceRoll } from '../../../shared/models/rpg-models';
import type { RealtimeEvent } from '../../../shared/models/realtime-event.model';
import { DiceStore } from './dice.store';

@Injectable({ providedIn: 'root' })
export class DiceService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly realtime: RealtimeService,
    private readonly store: DiceStore,
  ) {}

  // ── Initial Load ────────────────────────────────────────────────────

  async loadRecentRolls(limit = 50): Promise<void> {
    this.store.patch({ isLoading: true, error: null });
    try {
      const rolls = await this.supabase.fetchAll<DiceRoll>('dice_rolls');
      // Como o Supabase retorna em ordem de criação, pegamos os últimos N
      this.store.patch({ rolls: rolls.slice(-limit), isLoading: false });
    } catch (err) {
      this.store.patch({ isLoading: false, error: 'Falha ao carregar rolagens' });
    }
  }

  // ── Realtime Subscription (persisted rolls via postgres_changes) ───

  subscribeToRealtime(): void {
    this.realtime
      .onChanges<DiceRoll>('dice_rolls', 'INSERT')
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => {
        if (e.new) this.store.addRoll(e.new as DiceRoll);
      });

    // Broadcast: efeito visual transitório (dado rolando, animações)
    this.realtime
      .onBroadcast<DiceRollResult>('dice:rolled')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        // A rolagem real já chegou via postgres_changes.
        // O broadcast serve apenas para disparar animações no momento exato.
        console.debug('[dice:broadcast]', data);
      });
  }

  // ── Roll Operation ──────────────────────────────────────────────────

  async roll(
    notation: string,
    rollerUserId: string,
    characterId?: string,
  ): Promise<DiceRoll> {
    const result = this.evaluateNotation(notation);

    // 1. Persistir no Supabase (histórico)
    const saved = await this.supabase.insert<DiceRoll>('dice_rolls', {
      roller_user_id: rollerUserId,
      character_id: characterId ?? null,
      notation,
      result,
    } as Partial<DiceRoll>);

    // 2. Atualizar store local imediatamente
    this.store.addRoll(saved);

    // 3. Broadcast para disparar animações nos outros clientes
    this.realtime.broadcast<DiceRollResult>('dice:rolled', {
      notation,
      result,
      rollerUserId,
      characterId: characterId ?? null,
    });

    return saved;
  }

  // ── Dice Formula Parser ────────────────────────────────────────────

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private evaluateNotation(notation: string): number {
    // Suporta formatos como: "2d10 + STR_MOD + 3", "1d20", "4d6"
    try {
      let formula = notation.replace(/\s+/g, '');

      // Placeholders para atributos (serão resolvidos pelo componente chamador)
      // Aqui retornamos um valor padrão — o componente deve injetar atributos antes de chamar
      const diceRegex = /(\d+)d(\d+)/g;
      let match: RegExpExecArray | null;
      let total = 0;

      while ((match = diceRegex.exec(formula)) !== null) {
        const count = parseInt(match[1], 10);
        const sides = parseInt(match[2], 10);
        for (let i = 0; i < count; i++) {
          total += Math.floor(Math.random() * sides) + 1;
        }
      }

      // Remove as partes NdX já processadas
      formula = formula.replace(diceRegex, '');

      // Processa modificadores fixos (+N, -N)
      const modRegex = /[+-]\d+/g;
      while ((match = modRegex.exec(formula)) !== null) {
        total += parseInt(match[0], 10);
      }

      return total;
    } catch {
      return 0;
    }
  }
}

// Broadcast payload (não persistido, usado só para animações)
export interface DiceRollResult {
  notation: string;
  result: number;
  rollerUserId: string;
  characterId: string | null;
}
