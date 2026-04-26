import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CharacterService } from '../../domain/character/services/character.service';
import { CharacterStore } from '../../domain/character/services/character.store';

@Component({
  selector: 'app-game-table',
  imports: [RouterLink, AsyncPipe, ReactiveFormsModule],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="logo">RPG<br />Session</div>
        <nav>
          <a class="nav-item" routerLink="/stage">Stage</a>
          <a class="nav-item active" routerLink="/table">Personagens</a>
          <a class="nav-item disabled">Chat</a>
          <a class="nav-item disabled">Dados</a>
          <a class="nav-item disabled">Mapa</a>
        </nav>
        <div class="sidebar-footer">
          <span class="user-role" [class.master]="auth.isMaster()">
            {{ auth.isMaster() ? 'Mestre' : 'Jogador' }}
          </span>
          <button class="logout" (click)="auth.signOut()">Sair</button>
        </div>
      </aside>

      <main class="main">
        <header class="header">
          <div>
            <h1>Personagens</h1>
            <p class="subtitle">{{ (characters$ | async)?.length ?? 0 }} personagens na mesa</p>
          </div>
          <button class="btn-primary" (click)="showCreate.set(true)">+ Novo Personagem</button>
        </header>

        <!-- Create Dialog -->
        @if (showCreate()) {
          <div class="modal-backdrop" (click)="showCreate.set(false)">
            <form
              class="modal"
              [formGroup]="createForm"
              (click)="$event.stopPropagation()"
              (submit)="createCharacter()"
            >
              <h2>Criar Personagem</h2>
              <label>
                Nome
                <input type="text" formControlName="name" placeholder="Nome do personagem" />
              </label>
              <label>
                Raça
                <input type="text" formControlName="race" placeholder="Elfo, Humano, Anão..." />
              </label>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="showCreate.set(false)">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="createForm.invalid || creating()">
                  {{ creating() ? 'Criando...' : 'Criar' }}
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Delete Confirm -->
        @if (deleteTarget()) {
          <div class="modal-backdrop" (click)="deleteTarget.set(null)">
            <div class="modal modal-sm" (click)="$event.stopPropagation()">
              <h2>Remover Personagem</h2>
              <p>Tem certeza que deseja remover <strong>{{ deleteTarget()!.name }}</strong>?</p>
              <div class="modal-actions">
                <button class="btn-ghost" (click)="deleteTarget.set(null)">Cancelar</button>
                <button class="btn-danger" (click)="confirmDelete()">Remover</button>
              </div>
            </div>
          </div>
        }

        <!-- Character Cards -->
        @if (characters$ | async; as characters) {
          @if (characters.length === 0) {
            <div class="empty-state">
              <div class="empty-icon">&#9876;</div>
              <h2>Nenhum personagem</h2>
              <p>Crie o primeiro personagem para começar a aventura.</p>
            </div>
          }

          <div class="char-grid">
            @for (c of characters; track c.id) {
              <div class="char-card">
                <a class="card-link" [routerLink]="['/character', c.id]">
                  <div class="card-avatar">
                    {{ c.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="card-body">
                    <h3>{{ c.name }}</h3>
                    <span class="card-race">{{ c.race || 'Sem raça' }}</span>
                    <div class="card-stats">
                      <div class="stat">
                        <div class="stat-bar">
                          <div class="stat-fill hp" [style.width.%]="hpPercent(c)"></div>
                        </div>
                        <span>HP {{ c.hp }}/{{ c.hp_max }}</span>
                      </div>
                      <div class="stat">
                        <div class="stat-bar">
                          <div class="stat-fill mana" [style.width.%]="manaPercent(c)"></div>
                        </div>
                        <span>Mana {{ c.mana }}/{{ c.mana_max }}</span>
                      </div>
                    </div>
                  </div>
                </a>
                <button
                  class="card-delete"
                  title="Remover"
                  (click)="deleteTarget.set(c); $event.stopPropagation()"
                >
                  &times;
                </button>
              </div>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: `
    :host { display: block; height: 100dvh; }

    .layout {
      display: flex;
      height: 100%;
      background: #0d0f1a;
      color: #c8ccd4;
    }

    /* Sidebar */
    .sidebar {
      width: 220px;
      background: #11131f;
      border-right: 1px solid #1e2235;
      display: flex;
      flex-direction: column;
      padding: 1.5rem 0;
      flex-shrink: 0;
    }

    .logo {
      font-size: 1.1rem;
      font-weight: 700;
      color: #e94560;
      letter-spacing: 0.05em;
      padding: 0 1.5rem 1.5rem;
      border-bottom: 1px solid #1e2235;
      margin-bottom: 1rem;
      line-height: 1.3;
    }

    nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0 0.75rem;
    }

    .nav-item {
      padding: 0.6rem 0.75rem;
      border-radius: 6px;
      color: #6b7084;
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.15s;
    }

    .nav-item.active {
      background: #1a1e30;
      color: #e0e2e8;
    }

    .nav-item.disabled {
      opacity: 0.35;
      pointer-events: none;
    }

    .nav-item:not(.disabled):hover {
      background: #1a1e30;
      color: #e0e2e8;
    }

    .sidebar-footer {
      padding: 1.5rem 1.5rem 0;
      border-top: 1px solid #1e2235;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .user-role {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: #1e2235;
      color: #6b7084;
    }

    .user-role.master {
      background: #2d1520;
      color: #e94560;
    }

    .logout {
      font-size: 0.75rem;
      background: none;
      border: none;
      color: #6b7084;
      cursor: pointer;
    }

    .logout:hover { color: #e94560; }

    /* Main */
    .main {
      flex: 1;
      overflow-y: auto;
      padding: 2rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }

    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 600;
      color: #e0e2e8;
    }

    .subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: #6b7084;
    }

    .btn-primary {
      padding: 0.6rem 1.25rem;
      background: #e94560;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-primary:hover:not(:disabled) { background: #d63851; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-ghost {
      padding: 0.6rem 1.25rem;
      background: transparent;
      color: #6b7084;
      border: 1px solid #1e2235;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .btn-ghost:hover { background: #1a1e30; color: #e0e2e8; }

    .btn-danger {
      padding: 0.6rem 1.25rem;
      background: #e94560;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .modal {
      background: #161824;
      border: 1px solid #1e2235;
      border-radius: 12px;
      padding: 1.75rem;
      width: 440px;
      max-width: 90vw;
    }

    .modal h2 {
      margin: 0 0 1.25rem;
      font-size: 1.15rem;
      color: #e0e2e8;
    }

    .modal p {
      margin: 0 0 1.5rem;
      color: #6b7084;
      line-height: 1.5;
    }

    .modal label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1rem;
      font-size: 0.8rem;
      color: #6b7084;
    }

    .modal input {
      padding: 0.6rem 0.75rem;
      border: 1px solid #1e2235;
      border-radius: 6px;
      background: #0d0f1a;
      color: #e0e2e8;
      font-size: 0.9rem;
    }

    .modal input:focus { outline: none; border-color: #e94560; }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .modal-sm { width: 380px; }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.3; }

    .empty-state h2 {
      font-size: 1.25rem;
      color: #e0e2e8;
      margin: 0 0 0.5rem;
    }

    .empty-state p { color: #6b7084; }

    /* Character grid */
    .char-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }

    .char-card {
      position: relative;
      background: #11131f;
      border: 1px solid #1e2235;
      border-radius: 10px;
      overflow: hidden;
      transition: border-color 0.15s, transform 0.15s;
    }

    .char-card:hover {
      border-color: #2d3250;
      transform: translateY(-1px);
    }

    .card-link {
      display: flex;
      gap: 1rem;
      padding: 1.25rem;
      text-decoration: none;
      color: inherit;
    }

    .card-avatar {
      width: 52px;
      height: 52px;
      border-radius: 10px;
      background: linear-gradient(135deg, #e94560, #c23152);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }

    .card-body {
      flex: 1;
      min-width: 0;
    }

    .card-body h3 {
      margin: 0;
      font-size: 1rem;
      color: #e0e2e8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-race {
      font-size: 0.75rem;
      color: #6b7084;
    }

    .card-stats {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stat-bar {
      flex: 1;
      height: 6px;
      background: #1e2235;
      border-radius: 3px;
      overflow: hidden;
    }

    .stat-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }

    .stat-fill.hp { background: #4caf50; }
    .stat-fill.mana { background: #5c6bc0; }

    .stat span {
      font-size: 0.7rem;
      color: #6b7084;
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
      width: 80px;
      text-align: right;
    }

    .card-delete {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #3d3f50;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .card-delete:hover {
      background: #2d1520;
      color: #e94560;
    }
  `,
})
export class GameTableComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  private readonly characterService = inject(CharacterService);
  private readonly store = inject(CharacterStore);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly characters$ = this.store.characters$;
  readonly showCreate = signal(false);
  readonly creating = signal(false);
  readonly deleteTarget = signal<{ id: string; name: string } | null>(null);

  readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    race: [''],
  });

  constructor() {
    this.characterService.loadAllCharacters();
  }

  async createCharacter(): Promise<void> {
    if (this.createForm.invalid) return;
    this.creating.set(true);

    const { name, race } = this.createForm.getRawValue();
    await this.characterService.createCharacter({
      user_id: this.auth.currentUserId()!,
      name: name!,
      race: race ?? '',
      biography: '',
      photo_url: '',
      notes: '',
      hp: 10, hp_max: 10,
      magic: 0, magic_max: 0,
      mana: 0, mana_max: 0,
      xp: 0,
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, inspiration: 0,
    });

    this.createForm.reset();
    this.showCreate.set(false);
    this.creating.set(false);
  }

  async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    await this.characterService.deleteCharacter(target.id);
    this.deleteTarget.set(null);
  }

  hpPercent(c: { hp: number; hp_max: number }): number {
    if (c.hp_max === 0) return 0;
    return Math.min(100, (c.hp / c.hp_max) * 100);
  }

  manaPercent(c: { mana: number; mana_max: number }): number {
    if (c.mana_max === 0) return 0;
    return Math.min(100, (c.mana / c.mana_max) * 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
