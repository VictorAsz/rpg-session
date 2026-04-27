import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../domain/compendium/services/catalog.service';
import { CatalogStore } from '../../domain/compendium/services/catalog.store';
import type { ItemCatalog } from '../../shared/models/rpg-models';

@Component({
  selector: 'app-items-catalog',
  imports: [ReactiveFormsModule, AsyncPipe, RouterLink],
  template: `
    <div class="layout">
      <!-- SIDEBAR -->
      <aside class="sidebar">
        <a class="sb-back" routerLink="/stage">&#8592; Stage</a>
        <h1 class="sb-title">Itens</h1>
        <nav class="sb-nav">
          <a class="sb-item active" routerLink="/items">Catálogo</a>
        </nav>
        <div class="sb-footer">
          <span class="sb-badge" [class.master]="auth.isMaster()">{{ auth.isMaster() ? 'MESTRE' : 'JOGADOR' }}</span>
          <button class="sb-logout" (click)="auth.signOut()">Sair</button>
        </div>
      </aside>

      <!-- MAIN -->
      <main class="main">
        <header class="header">
          <div>
            <h2>Catálogo de Itens</h2>
            <p class="subtitle">Equipamentos, poções e artefatos</p>
          </div>
          @if (auth.isMaster()) {
            <button class="btn-primary" (click)="openForm()">+ Novo Item</button>
          }
        </header>

        <!-- FORM MODAL -->
        @if (showForm()) {
          <div class="modal-backdrop" (click)="showForm.set(false)">
            <form class="modal" [formGroup]="itemForm" (click)="$event.stopPropagation()" (submit)="save()">
              <h3>{{ editingId() ? 'Editar' : 'Novo' }} Item</h3>
              <div class="form-grid">
                <label>Nome <input formControlName="name" /></label>
                <label>Valor (moedas) <input type="number" formControlName="value" /></label>
                <label class="span-2">Descrição <textarea formControlName="description" rows="3"></textarea></label>
                <label class="span-2">URL Imagem <input formControlName="image_url" /></label>
                <label class="checkbox-label"><input type="checkbox" formControlName="is_usable" /> Utilizável</label>
                <label>Fórmula <input formControlName="effectFormula" placeholder="ex: 2d10" /></label>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showForm.set(false)">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="itemForm.invalid">Salvar</button>
              </div>
            </form>
          </div>
        }

        <!-- ITEMS GRID -->
        @if (catalogStore.items$ | async; as items) {
          @if (items.length === 0) {
            <div class="empty-state">
              <span class="empty-icon">&#9876;</span>
              <p>Nenhum item no catálogo</p>
            </div>
          }
          <div class="items-grid">
            @for (it of items; track it.id) {
              <div class="item-card" [class.usable]="it.is_usable">
                <div class="item-image">
                  @if (it.image_url) {
                    <img [src]="it.image_url" alt="" />
                  } @else {
                    <span class="item-icon">{{ itemIcon(it) }}</span>
                  }
                </div>
                <div class="item-body">
                  <div class="item-header">
                    <strong>{{ it.name }}</strong>
                    <span class="item-value">{{ it.value }} <small>moedas</small></span>
                  </div>
                  @if (it.description) {
                    <p class="item-desc">{{ it.description }}</p>
                  }
                  <div class="item-tags">
                    @if (it.is_usable) {
                      <span class="item-tag usable">&#9889; Utilizável</span>
                    }
                    @if (it.effect?.formula) {
                      <span class="item-tag formula">{{ it.effect.formula }}</span>
                    }
                    @if (it.effect?.type && it.effect.type !== 'custom') {
                      <span class="item-tag type">{{ effectLabel(it.effect.type) }}</span>
                    }
                  </div>
                </div>
                @if (auth.isMaster()) {
                  <div class="item-actions">
                    <button class="btn-sm" (click)="editItem(it)">Editar</button>
                    <button class="btn-sm danger" (click)="catalogService.deleteItem(it.id)">Remover</button>
                  </div>
                }
              </div>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100dvh; }

    .layout { display: flex; height: 100%; }

    /* SIDEBAR — standardized */
    .sidebar {
      width: var(--theme-sidebar-width);
      background: var(--theme-sidebar-bg);
      border-right: 1px solid var(--theme-sidebar-border);
      display: flex; flex-direction: column;
      padding: 1.25rem;
      flex-shrink: 0;
    }
    .sb-back { font-size: 0.75rem; color: var(--theme-text-muted); text-decoration: none; margin-bottom: 0.75rem; }
    .sb-back:hover { color: var(--theme-primary); }
    .sb-title { font-size: 1.05rem; color: var(--theme-primary); margin: 0 0 1rem; font-weight: 700; }
    .sb-nav { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
    .sb-item { padding: 0.5rem 0.75rem; border-radius: var(--theme-radius-sm); font-size: 0.825rem; color: var(--theme-text-muted); text-decoration: none; transition: all var(--theme-transition); }
    .sb-item:hover { background: var(--theme-surface-hover); color: var(--theme-text); }
    .sb-item.active { background: var(--theme-primary-bg); color: var(--theme-primary); }
    .sb-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--theme-border); padding-top: 0.75rem; }
    .sb-badge { font-size: 0.6rem; padding: 0.15rem 0.5rem; border-radius: 3px; background: var(--theme-surface-hover); color: var(--theme-text-muted); font-weight: 600; letter-spacing: 0.06em; }
    .sb-badge.master { background: var(--theme-primary-bg); color: var(--theme-primary); }
    .sb-logout { background: none; border: none; color: var(--theme-text-muted); cursor: pointer; font-size: 0.7rem; }
    .sb-logout:hover { color: var(--theme-primary); }

    /* MAIN */
    .main { flex: 1; overflow-y: auto; padding: 1.75rem 2rem; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    h2 { margin: 0; font-size: 1.35rem; color: var(--theme-heading); font-weight: 600; }
    .subtitle { margin: 0.25rem 0 0; font-size: 0.8rem; color: var(--theme-text-muted); }
    h3 { margin: 0 0 1rem; font-size: 1.05rem; color: var(--theme-heading); }

    /* BUTTONS */
    .btn-primary { padding: 0.55rem 1.2rem; background: var(--theme-primary); color: #fff; border: none; border-radius: var(--theme-radius-sm); font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all var(--theme-transition); }
    .btn-primary:hover:not(:disabled) { background: var(--theme-primary-hover); box-shadow: var(--theme-shadow-sm); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { padding: 0.5rem 1.1rem; background: none; color: var(--theme-text-muted); border: 1px solid var(--theme-border); border-radius: var(--theme-radius-sm); font-size: 0.8rem; cursor: pointer; transition: all var(--theme-transition); }
    .btn-ghost:hover { background: var(--theme-surface-hover); color: var(--theme-text); }
    .btn-sm { padding: 0.3rem 0.65rem; border: 1px solid var(--theme-border); border-radius: var(--theme-radius-sm); background: var(--theme-surface); color: var(--theme-text-muted); font-size: 0.72rem; cursor: pointer; transition: all var(--theme-transition); }
    .btn-sm:hover { border-color: var(--theme-primary); color: var(--theme-text); }
    .btn-sm.danger { color: var(--theme-primary); }
    .btn-sm.danger:hover { background: var(--theme-primary-bg); border-color: var(--theme-primary); }

    /* ITEMS GRID */
    .items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1rem;
    }

    .item-card {
      background: var(--theme-surface);
      border: 1px solid var(--theme-border);
      border-radius: var(--theme-radius-md);
      overflow: hidden;
      transition: all var(--theme-transition);
      position: relative;
    }
    .item-card:hover {
      border-color: color-mix(in srgb, var(--theme-primary) 30%, var(--theme-border));
      box-shadow: var(--theme-shadow-md);
      transform: translateY(-1px);
    }
    .item-card.usable { border-left: 3px solid var(--theme-accent-green); }

    .item-image {
      height: 120px;
      background: var(--theme-surface-hover);
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid var(--theme-border);
    }
    .item-image img {
      width: 100%; height: 100%;
      object-fit: cover;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    .item-card:hover .item-image img { opacity: 1; }
    .item-icon {
      font-size: 2.5rem;
      opacity: 0.15;
      transition: opacity 0.2s;
    }
    .item-card:hover .item-icon { opacity: 0.3; }

    .item-body {
      padding: 0.9rem 1rem;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }
    .item-header strong {
      font-size: 0.95rem;
      color: var(--theme-heading);
      font-weight: 600;
    }
    .item-value {
      font-size: 0.7rem;
      color: var(--theme-accent-gold);
      font-weight: 600;
      white-space: nowrap;
      font-family: var(--theme-font-mono);
    }
    .item-value small { font-weight: 400; opacity: 0.7; }

    .item-desc {
      font-size: 0.75rem;
      color: var(--theme-text-muted);
      line-height: 1.5;
      margin: 0.35rem 0 0.5rem;
    }

    .item-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.4rem;
    }
    .item-tag {
      font-size: 0.62rem;
      padding: 0.18rem 0.5rem;
      border-radius: 3px;
      background: var(--theme-surface-hover);
      color: var(--theme-text-muted);
    }
    .item-tag.usable {
      background: rgba(76,175,80,0.1);
      color: var(--theme-accent-green);
    }
    .item-tag.formula {
      background: rgba(233,69,96,0.08);
      color: var(--theme-primary);
      font-family: var(--theme-font-mono);
    }
    .item-tag.type {
      background: rgba(76,175,80,0.06);
      color: var(--theme-accent-green);
    }

    .item-actions {
      display: flex;
      gap: 0.3rem;
      padding: 0.5rem 1rem;
      border-top: 1px solid var(--theme-border);
    }

    /* EMPTY */
    .empty-state { text-align: center; padding: 4rem 2rem; }
    .empty-icon { font-size: 2.5rem; opacity: 0.15; display: block; margin-bottom: 0.75rem; }
    .empty-state p { color: var(--theme-text-dim); font-style: italic; font-size: 0.9rem; }

    /* MODAL */
    .modal-backdrop { position: fixed; inset: 0; background: var(--theme-modal-backdrop); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--theme-modal-bg); border: 1px solid var(--theme-border); border-radius: var(--theme-radius-lg); padding: 1.5rem; width: 500px; max-width: 90vw; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem; }
    .form-grid label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.7rem; color: var(--theme-text-muted); }
    .form-grid .span-2 { grid-column: span 2; }
    .form-grid input, .form-grid select, .form-grid textarea { padding: 0.45rem 0.6rem; border: 1px solid var(--theme-input-border); border-radius: var(--theme-radius-sm); background: var(--theme-input-bg); color: var(--theme-text); font-size: 0.8rem; font-family: inherit; }
    .form-grid input:focus, .form-grid select:focus, .form-grid textarea:focus { outline: none; border-color: var(--theme-input-focus); }
    .checkbox-label { flex-direction: row !important; align-items: center; gap: 0.5rem !important; }
    .checkbox-label input { width: auto; accent-color: var(--theme-primary); }
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  `],
})
export class ItemsCatalogComponent {
  readonly auth = inject(AuthService);
  readonly catalogService = inject(CatalogService);
  readonly catalogStore = inject(CatalogStore);
  private readonly fb = inject(FormBuilder);

  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly itemForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    image_url: [''],
    value: [0],
    is_usable: [false],
    effectFormula: [''],
  });

  constructor() { this.catalogService.loadCatalog(); }

  itemIcon(item: ItemCatalog): string {
    if (item.effect?.type === 'heal') return '\u{1F3FA}';
    if (item.effect?.type === 'damage') return '\u2694';
    if (item.is_usable) return '\u{1F9EA}';
    return '\u{1F3FA}';
  }

  effectLabel(type: string): string {
    const m: Record<string,string> = { damage: 'Dano', heal: 'Cura', buff: 'Buff', debuff: 'Debuff' };
    return m[type] ?? type;
  }

  openForm(): void {
    this.editingId.set(null);
    this.itemForm.reset({ value: 0, is_usable: false });
    this.showForm.set(true);
  }

  editItem(it: ItemCatalog): void {
    this.editingId.set(it.id);
    this.itemForm.patchValue({
      name: it.name, description: it.description, image_url: it.image_url,
      value: it.value, is_usable: it.is_usable,
      effectFormula: it.effect?.formula ?? '',
    });
    this.showForm.set(true);
  }

  async save(): Promise<void> {
    if (this.itemForm.invalid) return;
    const v = this.itemForm.getRawValue();
    const data: Partial<ItemCatalog> = {
      name: v.name!, description: v.description ?? '', image_url: v.image_url ?? '',
      value: v.value ?? 0, is_usable: v.is_usable ?? false,
      effect: { type: 'custom', formula: v.effectFormula ?? '' },
    };
    const id = this.editingId();
    if (id) await this.catalogService.updateItem(id, data);
    else await this.catalogService.createItem(data);
    this.showForm.set(false);
  }
}
