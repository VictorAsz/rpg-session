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
      <aside class="sidebar">
        <a class="back-link" routerLink="/stage">&#8592; Stage</a>
        <h1 class="title">Itens</h1>
        <div class="sidebar-footer">
          <span class="badge" [class.master]="auth.isMaster()">{{ auth.isMaster() ? 'MESTRE' : 'JOGADOR' }}</span>
          <button class="logout" (click)="auth.signOut()">Sair</button>
        </div>
      </aside>

      <main class="main">
        <header class="header">
          <h2>Catálogo de Itens</h2>
          @if (auth.isMaster()) {
            <button class="btn-primary" (click)="openForm()">+ Novo Item</button>
          }
        </header>

        @if (showForm()) {
          <div class="modal-backdrop" (click)="showForm.set(false)">
            <form class="modal" [formGroup]="itemForm" (click)="$event.stopPropagation()" (submit)="save()">
              <h3>{{ editingId() ? 'Editar' : 'Novo' }} Item</h3>
              <div class="form-grid">
                <label>Nome <input formControlName="name" /></label>
                <label>Valor <input type="number" formControlName="value" /></label>
                <label>Descrição <textarea formControlName="description" rows="2"></textarea></label>
                <label>URL Imagem <input formControlName="image_url" /></label>
                <label class="checkbox-label"><input type="checkbox" formControlName="is_usable" /> Utilizável</label>
                <label>Fórmula do Efeito <input formControlName="effectFormula" placeholder="2d10" /></label>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showForm.set(false)">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="itemForm.invalid">Salvar</button>
              </div>
            </form>
          </div>
        }

        @if (catalogStore.items$ | async; as items) {
          <div class="card-grid">
            @for (it of items; track it.id) {
              <div class="card">
                <div class="card-header">
                  <strong>{{ it.name }}</strong>
                  <span class="card-value">{{ it.value }} moedas</span>
                </div>
                @if (it.description) { <p class="card-desc">{{ it.description }}</p> }
                <div class="card-tags">
                  @if (it.is_usable) { <span class="tag usable">Utilizável</span> }
                  @if (it.effect?.formula) { <span class="tag formula">{{ it.effect.formula }}</span> }
                </div>
                @if (auth.isMaster()) {
                  <div class="card-actions">
                    <button class="btn-sm" (click)="editItem(it)">Editar</button>
                    <button class="btn-sm danger" (click)="catalogService.deleteItem(it.id)">Remover</button>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if ((catalogStore.items$ | async)?.length === 0) {
          <p class="empty">Nenhum item no catálogo.</p>
        }
      </main>
    </div>
  `,
  styles: `
    :host { display: block; height: 100dvh; background: #0d0f1a; color: #c8ccd4; }
    .layout { display: flex; height: 100%; }
    .sidebar { width: 180px; background: #11131f; border-right: 1px solid #1e2235; padding: 1.25rem; display: flex; flex-direction: column; flex-shrink: 0; }
    .back-link { color: #6b7084; text-decoration: none; font-size: 0.75rem; margin-bottom: 0.75rem; }
    .title { font-size: 1.05rem; color: #e94560; margin: 0 0 1rem; }
    .sidebar-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e2235; padding-top: 0.75rem; }
    .badge { font-size: 0.6rem; padding: 0.15rem 0.5rem; border-radius: 3px; background: #1e2235; color: #6b7084; }
    .badge.master { background: #2d1520; color: #e94560; }
    .logout { background: none; border: none; color: #6b7084; cursor: pointer; font-size: 0.7rem; }
    .main { flex: 1; overflow-y: auto; padding: 1.5rem 2rem; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    h2 { margin: 0; font-size: 1.25rem; color: #e0e2e8; }
    h3 { margin: 0 0 1rem; font-size: 1rem; color: #e0e2e8; }
    .btn-primary { padding: 0.5rem 1.1rem; background: #e94560; color: #fff; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
    .btn-ghost { padding: 0.5rem 1.1rem; background: none; color: #6b7084; border: 1px solid #1e2235; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
    .btn-sm { padding: 0.25rem 0.6rem; border: 1px solid #1e2235; border-radius: 4px; background: #11131f; color: #6b7084; font-size: 0.7rem; cursor: pointer; }
    .btn-sm.danger { color: #e94560; }
    .btn-sm:hover { border-color: #2d3250; color: #c8ccd4; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.75rem; }
    .card { background: #11131f; border: 1px solid #1e2235; border-radius: 8px; padding: 0.9rem; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem; }
    .card-header strong { font-size: 0.95rem; color: #e0e2e8; }
    .card-value { font-size: 0.7rem; color: #ffd740; }
    .card-desc { font-size: 0.75rem; color: #6b7084; margin: 0.3rem 0; line-height: 1.4; }
    .card-tags { display: flex; gap: 0.25rem; margin: 0.4rem 0; }
    .tag { font-size: 0.6rem; padding: 0.15rem 0.4rem; border-radius: 3px; background: #161824; color: #6b7084; }
    .tag.usable { color: #4caf50; }
    .tag.formula { color: #e94560; font-family: 'JetBrains Mono', monospace; }
    .card-actions { display: flex; gap: 0.3rem; margin-top: 0.5rem; }
    .empty { text-align: center; color: #3d3f50; padding: 2rem; font-style: italic; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #161824; border: 1px solid #1e2235; border-radius: 12px; padding: 1.5rem; width: 480px; max-width: 90vw; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem; }
    .form-grid label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.7rem; color: #6b7084; }
    .form-grid input, .form-grid select, .form-grid textarea { padding: 0.4rem 0.55rem; border: 1px solid #1e2235; border-radius: 4px; background: #0d0f1a; color: #e0e2e8; font-size: 0.8rem; }
    .form-grid input:focus, .form-grid textarea:focus { outline: none; border-color: #e94560; }
    .checkbox-label { flex-direction: row !important; align-items: center; gap: 0.5rem !important; }
    .checkbox-label input { width: auto; }
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  `,
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
