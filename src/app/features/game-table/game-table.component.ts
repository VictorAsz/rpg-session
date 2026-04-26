import { Component, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CharacterService } from '../../domain/character/services/character.service';
import { CharacterStore } from '../../domain/character/services/character.store';

@Component({
  selector: 'app-game-table',
  imports: [RouterLink, AsyncPipe],
  template: `
    <div class="game-table">
      <header>
        <h2>Mesa de Jogo</h2>
        <button class="logout" (click)="auth.signOut()">Sair</button>
      </header>

      <section>
        <h3>Personagens</h3>
        @if (characters$ | async; as characters) {
          @if (characters.length === 0) {
            <p class="empty">Nenhum personagem criado.</p>
          }
          @for (c of characters; track c.id) {
            <a class="char-card" [routerLink]="['/character', c.id]">
              <strong>{{ c.name }}</strong>
              <span class="char-race">{{ c.race }}</span>
              <span class="char-hp">HP {{ c.hp }}/{{ c.hp_max }}</span>
            </a>
          }
        }
      </section>
    </div>
  `,
  styles: `
    .game-table {
      max-width: 700px;
      margin: 0 auto;
      padding: 2rem;
      color: #e0e0e0;
      background: #1a1a2e;
      min-height: 100dvh;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;

      h2 { margin: 0; color: #e94560; }
    }

    .logout {
      background: #3d1010;
      color: #e94560;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }

    h3 { color: #a0a8c0; font-size: 0.9rem; margin-bottom: 1rem; }

    .char-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: #16213e;
      border: 1px solid #0f3460;
      border-radius: 6px;
      margin-bottom: 0.5rem;
      text-decoration: none;
      color: #e0e0e0;
      transition: border-color 0.2s;

      &:hover { border-color: #e94560; }

      strong { flex: 1; }
      .char-race { color: #a0a8c0; font-size: 0.8rem; }
      .char-hp {
        color: #4caf50;
        font-size: 0.8rem;
        font-family: monospace;
      }
    }

    .empty {
      color: #555;
      font-style: italic;
      text-align: center;
      padding: 2rem;
    }
  `,
})
export class GameTableComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  private readonly characterService = inject(CharacterService);
  private readonly store = inject(CharacterStore);
  private readonly destroy$ = new Subject<void>();

  readonly characters$ = this.store.characters$;

  constructor() {
    this.characterService.loadAllCharacters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
