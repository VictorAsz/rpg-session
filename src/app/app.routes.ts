import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { GameTableComponent } from './features/game-table/game-table.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'table', component: GameTableComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/table', pathMatch: 'full' },
  { path: '**', redirectTo: '/table' },
];
