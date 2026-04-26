import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupabaseService } from '../../../core/services/supabase.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import type { RealtimeEvent } from '../../../shared/models/realtime-event.model';
import type { SpellCatalog, AbilityCatalog, ItemCatalog } from '../../../shared/models/rpg-models';
import { CatalogStore } from './catalog.store';

@Injectable({ providedIn: 'root' })
export class CatalogService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly realtime = inject(RealtimeService);
  private readonly store = inject(CatalogStore);
  private readonly destroy$ = new Subject<void>();

  async loadCatalog(): Promise<void> {
    this.store.patch({ isLoading: true, error: null });
    try {
      const [spells, abilities, items] = await Promise.all([
        this.supabase.fetchAll<SpellCatalog>('spells_catalog'),
        this.supabase.fetchAll<AbilityCatalog>('abilities_catalog'),
        this.supabase.fetchAll<ItemCatalog>('items_catalog'),
      ]);
      this.store.patch({ spells, abilities, items, isLoading: false });
    } catch {
      this.store.patch({ isLoading: false, error: 'Falha ao carregar catálogo' });
    }
  }

  subscribeToRealtime(): void {
    this.realtime.onChanges<SpellCatalog>('spells_catalog', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe(e => { if (e.event === 'DELETE') this.store.removeSpell((e.old as any)['id']); else if (e.new) this.store.upsertSpell(e.new as SpellCatalog); });

    this.realtime.onChanges<AbilityCatalog>('abilities_catalog', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe(e => { if (e.event === 'DELETE') this.store.removeAbility((e.old as any)['id']); else if (e.new) this.store.upsertAbility(e.new as AbilityCatalog); });

    this.realtime.onChanges<ItemCatalog>('items_catalog', '*')
      .pipe(takeUntil(this.destroy$))
      .subscribe(e => { if (e.event === 'DELETE') this.store.removeItem((e.old as any)['id']); else if (e.new) this.store.upsertItem(e.new as ItemCatalog); });
  }

  async createSpell(data: Partial<SpellCatalog>): Promise<void> { const c = await this.supabase.insert<SpellCatalog>('spells_catalog', data); this.store.upsertSpell(c); }
  async updateSpell(id: string, data: Partial<SpellCatalog>): Promise<void> { const u = await this.supabase.update<SpellCatalog>('spells_catalog', id, data); this.store.upsertSpell(u); }
  async deleteSpell(id: string): Promise<void> { await this.supabase.delete('spells_catalog', id); this.store.removeSpell(id); }

  async createAbility(data: Partial<AbilityCatalog>): Promise<void> { const c = await this.supabase.insert<AbilityCatalog>('abilities_catalog', data); this.store.upsertAbility(c); }
  async updateAbility(id: string, data: Partial<AbilityCatalog>): Promise<void> { const u = await this.supabase.update<AbilityCatalog>('abilities_catalog', id, data); this.store.upsertAbility(u); }
  async deleteAbility(id: string): Promise<void> { await this.supabase.delete('abilities_catalog', id); this.store.removeAbility(id); }

  async createItem(data: Partial<ItemCatalog>): Promise<void> { const c = await this.supabase.insert<ItemCatalog>('items_catalog', data); this.store.upsertItem(c); }
  async updateItem(id: string, data: Partial<ItemCatalog>): Promise<void> { const u = await this.supabase.update<ItemCatalog>('items_catalog', id, data); this.store.upsertItem(u); }
  async deleteItem(id: string): Promise<void> { await this.supabase.delete('items_catalog', id); this.store.removeItem(id); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
