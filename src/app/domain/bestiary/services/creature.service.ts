import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupabaseService } from '../../../core/services/supabase.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import type { RealtimeEvent } from '../../../shared/models/realtime-event.model';
import type { Creature, CreatureAbility } from '../../../shared/models/bestiary-models';
import { CreatureStore } from './creature.store';

@Injectable({ providedIn: 'root' })
export class CreatureService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly realtime = inject(RealtimeService);
  private readonly store = inject(CreatureStore);
  private readonly destroy$ = new Subject<void>();

  async loadAll(): Promise<void> {
    this.store.patch({ isLoading: true, error: null });
    try {
      const creatures = await this.supabase.fetchAll<Creature>('creatures');
      this.store.patch({ creatures, isLoading: false });
    } catch {
      this.store.patch({ isLoading: false, error: 'Falha ao carregar bestiário' });
    }
  }

  async loadAbilities(creatureId: string): Promise<void> {
    try {
      const abilities = await this.supabase.fetchAll<CreatureAbility>('creature_abilities', {
        column: 'creature_id', value: creatureId,
      });
      this.store.setCreatureAbilities(creatureId, abilities);
    } catch {}
  }

  subscribeToRealtime(): void {
    this.realtime.onChanges<Creature>('creatures', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe(e => {
        if (e.event === 'DELETE') this.store.removeCreature((e.old as any)['id']);
        else if (e.new) this.store.upsertCreature(e.new as Creature);
      });

    this.realtime.onChanges<CreatureAbility>('creature_abilities', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe(e => {
        if (!e.new && !e.old) return;
        const record = (e.new ?? e.old) as CreatureAbility;
        if (e.event === 'DELETE') this.store.removeCreatureAbility(record.creature_id, (e.old as any)['id']);
        else this.store.addCreatureAbility(e.new as CreatureAbility);
      });
  }

  // CRUD
  async create(data: Partial<Creature>): Promise<Creature> {
    const c = await this.supabase.insert<Creature>('creatures', data);
    this.store.upsertCreature(c);
    return c;
  }

  async update(id: string, data: Partial<Creature>): Promise<Creature> {
    const c = await this.supabase.update<Creature>('creatures', id, data);
    this.store.upsertCreature(c);
    return c;
  }

  async delete(id: string): Promise<void> {
    await this.supabase.delete('creatures', id);
    this.store.removeCreature(id);
  }

  async addAbility(creatureId: string, abilityId: string, slotType: 'active' | 'passive', source: 'ability' | 'spell' = 'ability'): Promise<void> {
    const payload: any = {
      creature_id: creatureId,
      slot_type: slotType,
    };
    if (source === 'ability') payload.ability_id = abilityId;
    else payload.spell_id = abilityId;
    const ca = await this.supabase.insert<CreatureAbility>('creature_abilities', payload);
    this.store.addCreatureAbility(ca);
  }

  async removeAbility(id: string, creatureId: string): Promise<void> {
    await this.supabase.delete('creature_abilities', id);
    this.store.removeCreatureAbility(creatureId, id);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
