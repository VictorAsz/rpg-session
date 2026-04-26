import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { CatalogService } from '../../domain/compendium/services/catalog.service';
import { CatalogStore } from '../../domain/compendium/services/catalog.store';
import type { SpellCatalog, AbilityCatalog } from '../../shared/models/rpg-models';

type TabMode = 'spells' | 'abilities';

@Component({
  selector: 'app-compendium',
  imports: [ReactiveFormsModule, AsyncPipe, RouterLink],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <a class="back-link" routerLink="/stage">&#8592; Stage</a>
        <h1 class="title">Compêndio</h1>
        <nav>
          <button class="nav-btn" [class.active]="mode() === 'spells'" (click)="mode.set('spells')">Magias</button>
          <button class="nav-btn" [class.active]="mode() === 'abilities'" (click)="mode.set('abilities')">Habilidades</button>
        </nav>
        <div class="sidebar-footer">
          <span class="badge" [class.master]="auth.isMaster()">{{ auth.isMaster() ? 'MESTRE' : 'JOGADOR' }}</span>
          <button class="logout" (click)="auth.signOut()">Sair</button>
        </div>
      </aside>

      <main class="main">
        <header class="header">
          <h2>{{ mode() === 'spells' ? 'Magias' : 'Habilidades' }}</h2>
          @if (auth.isMaster()) {
            <button class="btn-primary" (click)="openForm()">+ Novo</button>
          }
        </header>

        <!-- ====== SPELL FORM MODAL ====== -->
        @if (showSpellForm()) {
          <div class="modal-backdrop" (click)="showSpellForm.set(false)">
            <form class="modal" [formGroup]="spellForm" (click)="$event.stopPropagation()" (submit)="saveSpell()">
              <h3>{{ editingId() ? 'Editar' : 'Nova' }} Magia</h3>
              <div class="form-grid">
                <label>Nome <input formControlName="name" /></label>
                <label>Custo Mana <input type="number" formControlName="mana_cost" /></label>
                <label>Descrição <textarea formControlName="description" rows="2"></textarea></label>
                <label>URL Imagem <input formControlName="image_url" /></label>
                <label>
                  Tipo de Conjuração
                  <select formControlName="type_cast">
                    <option value="conjuracao">Conjuração</option>
                    <option value="ritual">Ritual</option>
                    <option value="truque">Truque</option>
                    <option value="invocacao">Invocação</option>
                    <option value="encantamento">Encantamento</option>
                  </select>
                </label>
                <label>Escola <input formControlName="school" /></label>
                <label>Elemento <input formControlName="element" /></label>
                <label>Requisito <input formControlName="requirement" /></label>
                <label>
                  Alvo
                  <select formControlName="target_type">
                    <option value="single">Único</option>
                    <option value="self">Próprio</option>
                    <option value="area">Área</option>
                    <option value="all">Todos</option>
                  </select>
                </label>
                <label>Nível (1-10) <input type="number" formControlName="level" min="1" max="10" /></label>
                <label class="checkbox-label"><input type="checkbox" formControlName="is_visible" /> Visível aos jogadores</label>
                <label>Fórmula do Efeito <input formControlName="effectFormula" placeholder="2d10 + STR_MOD" /></label>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showSpellForm.set(false)">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="spellForm.invalid">Salvar</button>
              </div>
            </form>
          </div>
        }

        <!-- ====== ABILITY FORM MODAL ====== -->
        @if (showAbilityForm()) {
          <div class="modal-backdrop" (click)="showAbilityForm.set(false)">
            <form class="modal" [formGroup]="abilityForm" (click)="$event.stopPropagation()" (submit)="saveAbility()">
              <h3>{{ editingId() ? 'Editar' : 'Nova' }} Habilidade</h3>
              <div class="form-grid">
                <label>Nome <input formControlName="name" /></label>
                <label>
                  Tipo
                  <select formControlName="abilityType">
                    <option value="ativa">Ativa</option>
                    <option value="passiva">Passiva</option>
                    <option value="reacao">Reação</option>
                  </select>
                </label>
                <label>Descrição <textarea formControlName="description" rows="2"></textarea></label>
                <label>URL Imagem <input formControlName="imageUrl" /></label>
                <label>
                  Custo
                  <select formControlName="costType">
                    <option value="none">Nenhum</option>
                    <option value="mana">Mana</option>
                    <option value="hp">HP</option>
                  </select>
                </label>
                <label>Qtd. Custo <input type="number" formControlName="costAmount" /></label>
                <label>Escola <input formControlName="school" /></label>
                <label>Elemento <input formControlName="element" /></label>
                <label>Requisito <input formControlName="requirement" /></label>
                <label>
                  Alvo
                  <select formControlName="targetType">
                    <option value="self">Próprio</option>
                    <option value="single">Único</option>
                    <option value="area">Área</option>
                    <option value="all">Todos</option>
                  </select>
                </label>
                <label>Nível (1-10) <input type="number" formControlName="level" min="1" max="10" /></label>
                <label class="checkbox-label"><input type="checkbox" formControlName="isVisible" /> Visível aos jogadores</label>
                <label>Fórmula do Efeito <input formControlName="effectFormula" placeholder="2d10 + STR_MOD" /></label>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showAbilityForm.set(false)">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="abilityForm.invalid">Salvar</button>
              </div>
            </form>
          </div>
        }

        <!-- ====== SPELL LIST ====== -->
        @if (mode() === 'spells') {
          @if (catalogStore.spells$ | async; as spells) {
            <div class="card-grid">
              @for (sp of spells; track sp.id) {
                @if (sp.is_visible || auth.isMaster()) {
                  <div class="card" [class.hidden-card]="!sp.is_visible">
                    @if (!sp.is_visible) { <span class="hidden-tag">Oculto</span> }
                    <div class="card-header">
                      <strong>{{ sp.name }}</strong>
                      <span class="card-type">{{ sp.type_cast }}</span>
                    </div>
                    <div class="card-details">
                      @if (sp.school) { <span class="tag">{{ sp.school }}</span> }
                      @if (sp.element) { <span class="tag element">{{ sp.element }}</span> }
                      <span class="tag cost">{{ sp.mana_cost }} mana</span>
                      <span class="tag level">Nvl {{ sp.level }}</span>
                    </div>
                    @if (sp.description) { <p class="card-desc">{{ sp.description }}</p> }
                    @if (sp.requirement) { <p class="card-req">Requisito: {{ sp.requirement }}</p> }
                    <div class="card-meta">
                      <span class="tag target">{{ sp.target_type }}</span>
                      @if (sp.effect?.formula) { <span class="tag formula">{{ sp.effect.formula }}</span> }
                    </div>
                    @if (auth.isMaster()) {
                      <div class="card-actions">
                        <button class="btn-sm" (click)="editSpell(sp)">Editar</button>
                        <button class="btn-sm danger" (click)="catalogService.deleteSpell(sp.id)">Remover</button>
                      </div>
                    }
                  </div>
                }
              }
            </div>
            @if (spells.length === 0) { <p class="empty">Nenhuma magia no compêndio.</p> }
          }
        }

        <!-- ====== ABILITY LIST ====== -->
        @if (mode() === 'abilities') {
          @if (catalogStore.abilities$ | async; as abilities) {
            <div class="card-grid">
              @for (ab of abilities; track ab.id) {
                @if (ab.is_visible || auth.isMaster()) {
                  <div class="card ability-card" [class.hidden-card]="!ab.is_visible">
                    @if (!ab.is_visible) { <span class="hidden-tag">Oculto</span> }
                    <div class="card-header">
                      <strong>{{ ab.name }}</strong>
                      <span class="card-type">{{ ab.ability_type }}</span>
                    </div>
                    <div class="card-details">
                      @if (ab.school) { <span class="tag">{{ ab.school }}</span> }
                      @if (ab.element) { <span class="tag element">{{ ab.element }}</span> }
                      @if (ab.cost_type !== 'none') { <span class="tag cost">{{ ab.cost_amount }} {{ ab.cost_type }}</span> }
                      <span class="tag level">Nvl {{ ab.level }}</span>
                    </div>
                    @if (ab.description) { <p class="card-desc">{{ ab.description }}</p> }
                    @if (ab.requirement) { <p class="card-req">Requisito: {{ ab.requirement }}</p> }
                    <div class="card-meta">
                      <span class="tag target">{{ ab.target_type }}</span>
                      @if (ab.effect?.formula) { <span class="tag formula">{{ ab.effect.formula }}</span> }
                    </div>
                    @if (auth.isMaster()) {
                      <div class="card-actions">
                        <button class="btn-sm" (click)="editAbility(ab)">Editar</button>
                        <button class="btn-sm danger" (click)="catalogService.deleteAbility(ab.id)">Remover</button>
                      </div>
                    }
                  </div>
                }
              }
            </div>
            @if (abilities.length === 0) { <p class="empty">Nenhuma habilidade no compêndio.</p> }
          }
        }
      </main>
    </div>
  `,
  styles: `
    :host { display: block; height: 100dvh; background: #0d0f1a; color: #c8ccd4; font-family: 'Inter', system-ui, sans-serif; }
    .layout { display: flex; height: 100%; }
    .sidebar { width: 200px; background: #11131f; border-right: 1px solid #1e2235; padding: 1.25rem; display: flex; flex-direction: column; flex-shrink: 0; }
    .back-link { color: #6b7084; text-decoration: none; font-size: 0.75rem; margin-bottom: 0.75rem; }
    .title { font-size: 1.05rem; color: #e94560; margin: 0 0 1rem; }
    nav { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
    .nav-btn { padding: 0.45rem 0.6rem; border: none; border-radius: 4px; background: none; color: #6b7084; text-align: left; cursor: pointer; font-size: 0.8rem; }
    .nav-btn.active { background: #1a1e30; color: #e0e2e8; }
    .nav-btn:hover { background: #1a1e30; }
    .sidebar-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e2235; padding-top: 0.75rem; }
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
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 0.75rem; }
    .card { background: #11131f; border: 1px solid #1e2235; border-radius: 8px; padding: 0.9rem; position: relative; }
    .ability-card { border-left: 3px solid #5c6bc0; }
    .hidden-card { opacity: 0.45; }
    .hidden-tag { position: absolute; top: 0.3rem; right: 0.5rem; font-size: 0.55rem; color: #ff9800; background: #2d2010; padding: 0.1rem 0.4rem; border-radius: 3px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
    .card-header strong { font-size: 0.95rem; color: #e0e2e8; }
    .card-type { font-size: 0.6rem; padding: 0.15rem 0.4rem; border-radius: 3px; background: #1e2235; color: #6b7084; text-transform: capitalize; }
    .card-details { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.4rem; }
    .tag { font-size: 0.6rem; padding: 0.15rem 0.4rem; border-radius: 3px; background: #161824; color: #6b7084; }
    .tag.element { color: #69f0ae; }
    .tag.cost { color: #5c6bc0; }
    .tag.level { color: #ffc107; }
    .tag.target { color: #ff9100; }
    .tag.formula { color: #e94560; font-family: 'JetBrains Mono', monospace; }
    .card-desc { font-size: 0.75rem; color: #6b7084; margin: 0.3rem 0; line-height: 1.4; }
    .card-req { font-size: 0.65rem; color: #ffc107; margin: 0.2rem 0; }
    .card-meta { display: flex; gap: 0.25rem; margin-top: 0.4rem; }
    .card-actions { display: flex; gap: 0.3rem; margin-top: 0.6rem; }
    .empty { text-align: center; color: #3d3f50; padding: 2rem; font-style: italic; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #161824; border: 1px solid #1e2235; border-radius: 12px; padding: 1.5rem; width: 560px; max-width: 90vw; max-height: 85vh; overflow-y: auto; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem; }
    .form-grid label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.7rem; color: #6b7084; }
    .form-grid input, .form-grid select, .form-grid textarea { padding: 0.4rem 0.55rem; border: 1px solid #1e2235; border-radius: 4px; background: #0d0f1a; color: #e0e2e8; font-size: 0.8rem; }
    .form-grid input:focus, .form-grid select:focus, .form-grid textarea:focus { outline: none; border-color: #e94560; }
    .checkbox-label { flex-direction: row !important; align-items: center; gap: 0.5rem !important; }
    .checkbox-label input { width: auto; }
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
  `,
})
export class CompendiumComponent {
  readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);
  readonly catalogService = inject(CatalogService);
  readonly catalogStore = inject(CatalogStore);
  private readonly fb = inject(FormBuilder);

  readonly mode = signal<TabMode>('spells');
  readonly showSpellForm = signal(false);
  readonly showAbilityForm = signal(false);
  readonly editingId = signal<string | null>(null);

  // ── Spell Form ──────────────────────────────────────────────────────
  readonly spellForm = this.fb.group({
    name: ['', Validators.required],
    mana_cost: [0],
    description: [''],
    image_url: [''],
    type_cast: ['conjuracao'],
    school: [''],
    element: [''],
    requirement: [''],
    target_type: ['single'],
    level: [1],
    is_visible: [true],
    effectFormula: [''],
  });

  // ── Ability Form ────────────────────────────────────────────────────
  readonly abilityForm = this.fb.group({
    name: ['', Validators.required],
    abilityType: ['ativa'],
    description: [''],
    imageUrl: [''],
    costType: ['none'],
    costAmount: [0],
    school: [''],
    element: [''],
    requirement: [''],
    targetType: ['self'],
    level: [1],
    isVisible: [true],
    effectFormula: [''],
  });

  constructor() {
    this.realtime.connect('compendium');
    this.catalogService.loadCatalog();
    this.catalogService.subscribeToRealtime();
  }

  openForm(): void {
    this.editingId.set(null);
    if (this.mode() === 'spells') {
      this.spellForm.reset({ mana_cost: 0, level: 1, type_cast: 'conjuracao', is_visible: true, target_type: 'single' });
      this.showSpellForm.set(true);
    } else {
      this.abilityForm.reset({ abilityType: 'ativa', costType: 'none', costAmount: 0, level: 1, isVisible: true, targetType: 'self' });
      this.showAbilityForm.set(true);
    }
  }

  editSpell(sp: SpellCatalog): void {
    this.editingId.set(sp.id);
    this.spellForm.patchValue({
      name: sp.name, mana_cost: sp.mana_cost, description: sp.description,
      image_url: sp.image_url, type_cast: sp.type_cast, school: sp.school,
      element: sp.element, requirement: sp.requirement, target_type: sp.target_type,
      level: sp.level, is_visible: sp.is_visible, effectFormula: sp.effect?.formula ?? '',
    });
    this.showSpellForm.set(true);
  }

  editAbility(ab: AbilityCatalog): void {
    this.editingId.set(ab.id);
    this.abilityForm.patchValue({
      name: ab.name, abilityType: ab.ability_type, description: ab.description,
      imageUrl: ab.image_url, costType: ab.cost_type, costAmount: ab.cost_amount,
      school: ab.school, element: ab.element, requirement: ab.requirement,
      targetType: ab.target_type, level: ab.level, isVisible: ab.is_visible,
      effectFormula: ab.effect?.formula ?? '',
    });
    this.showAbilityForm.set(true);
  }

  async saveSpell(): Promise<void> {
    if (this.spellForm.invalid) return;
    const v = this.spellForm.getRawValue();
    const data: Partial<SpellCatalog> = {
      name: v.name!, mana_cost: v.mana_cost ?? 0, description: v.description ?? '',
      image_url: v.image_url ?? '', type_cast: (v.type_cast as SpellCatalog['type_cast']) ?? 'conjuracao',
      school: v.school ?? '', element: v.element ?? '', requirement: v.requirement ?? '',
      target_type: v.target_type ?? 'single', level: v.level ?? 1,
      is_visible: v.is_visible ?? true,
      effect: { type: 'custom', formula: v.effectFormula ?? '' },
    };
    const id = this.editingId();
    if (id) await this.catalogService.updateSpell(id, data);
    else await this.catalogService.createSpell(data);
    this.showSpellForm.set(false);
  }

  async saveAbility(): Promise<void> {
    if (this.abilityForm.invalid) return;
    const v = this.abilityForm.getRawValue();
    const data: Partial<AbilityCatalog> = {
      name: v.name!, ability_type: (v.abilityType as AbilityCatalog['ability_type']) ?? 'ativa',
      description: v.description ?? '', image_url: v.imageUrl ?? '',
      cost_type: (v.costType as AbilityCatalog['cost_type']) ?? 'none',
      cost_amount: v.costAmount ?? 0,
      school: v.school ?? '', element: v.element ?? '', requirement: v.requirement ?? '',
      target_type: v.targetType ?? 'self', level: v.level ?? 1,
      is_visible: v.isVisible ?? true,
      effect: { type: 'custom', formula: v.effectFormula ?? '' },
    };
    const id = this.editingId();
    if (id) await this.catalogService.updateAbility(id, data);
    else await this.catalogService.createAbility(data);
    this.showAbilityForm.set(false);
  }
}
