import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { GameTableComponent } from './features/game-table/game-table.component';
import { CharacterSheetComponent } from './features/character-sheet/character-sheet.component';
import { StageComponent } from './features/stage/stage.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'stage', component: StageComponent, canActivate: [authGuard] },
  { path: 'table', component: GameTableComponent, canActivate: [authGuard] },
  { path: 'character/:id', component: CharacterSheetComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/stage', pathMatch: 'full' },
  { path: '**', redirectTo: '/stage' },
];
