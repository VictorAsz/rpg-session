import { Component } from '@angular/core';

@Component({
  selector: 'app-game-table',
  template: `
    <div class="game-table">
      <h2>Mesa de Jogo</h2>
      <p>Conteudo da sessao aparecera aqui.</p>
    </div>
  `,
  styles: `
    .game-table {
      padding: 2rem;
      color: #eee;
    }
  `,
})
export class GameTableComponent {}
