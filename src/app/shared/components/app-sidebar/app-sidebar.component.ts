import { Component, input, output, inject, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

interface NavItem {
  route: string;
  icon: string;
  label: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { route: '/stage', icon: '\u2606', label: 'Stage' },
  { route: '/table', icon: '\u2603', label: 'Personagens' },
  { route: '/compendium', icon: '\u2726', label: 'Comp\u00EAndio' },
  { route: '/items', icon: '\u2660', label: 'Itens' },
  { route: '/bestiary', icon: '\u2620', label: 'Besti\u00E1rio' },
  { route: '', icon: '\u2694', label: 'Combate', disabled: true },
  { route: '', icon: '\u2318', label: 'Mapa', disabled: true },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  template: `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">RPG Session</span>
        @if (collapsible()) {
          <button class="sidebar-toggle" (click)="toggled.emit()" title="Recolher menu">
            &#10094;
          </button>
        }
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems; track item.label) {
          @if (item.disabled) {
            <span class="nav-item disabled">
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              <span class="nav-label">{{ item.label }}</span>
            </span>
          } @else {
            <a
              class="nav-item"
              [class.active]="isActive(item.route)"
              [routerLink]="item.route"
            >
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        }
      </nav>

      <div class="sidebar-footer">
        <div class="theme-switcher">
          @for (t of themeService.themes; track t.value) {
            <button
              class="theme-btn"
              [class.active]="themeService.current() === t.value"
              [title]="t.label"
              [innerHTML]="t.icon"
              (click)="themeService.set(t.value)"
            ></button>
          }
        </div>
        <span class="user-badge" [class.master]="auth.isMaster()">
          {{ auth.isMaster() ? 'MESTRE' : 'JOGADOR' }}
        </span>
        <button class="logout-btn" (click)="auth.signOut()">Sair</button>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: contents; }

    .sidebar {
      width: var(--theme-sidebar-width);
      background: var(--theme-sidebar-bg);
      backdrop-filter: blur(16px);
      border-right: 1px solid var(--theme-sidebar-border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      overflow: hidden;
      z-index: 10;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1rem;
      border-bottom: 1px solid var(--theme-border-light);
    }

    .brand-text {
      font-size: 1rem;
      font-weight: 700;
      color: var(--theme-primary);
      letter-spacing: 0.04em;
      white-space: nowrap;
      overflow: hidden;
    }

    .sidebar-toggle {
      width: 30px;
      height: 30px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--theme-radius-sm);
      background: rgba(255,255,255,0.04);
      color: var(--theme-text-muted);
      cursor: pointer;
      font-size: 0.7rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--theme-transition);
      flex-shrink: 0;
    }

    .sidebar-toggle:hover { background: rgba(255,255,255,0.08); color: var(--theme-text); }

    .sidebar-nav {
      flex: 1;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.55rem 0.75rem;
      border-radius: var(--theme-radius-sm);
      color: var(--theme-text-muted);
      text-decoration: none;
      font-size: 0.825rem;
      transition: all var(--theme-transition);
      white-space: nowrap;
      overflow: hidden;
    }

    .nav-item:hover { background: var(--theme-surface-hover); color: var(--theme-text); }
    .nav-item.active { background: var(--theme-primary-bg); color: var(--theme-primary); }
    .nav-item.disabled { opacity: 0.3; pointer-events: none; }

    .nav-icon { font-size: 0.9rem; width: 20px; text-align: center; flex-shrink: 0; }
    .nav-label { overflow: hidden; text-overflow: ellipsis; }

    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid var(--theme-border-light);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
    }

    .theme-switcher {
      display: flex;
      gap: 0.2rem;
      margin-right: auto;
    }

    .theme-btn {
      width: 26px; height: 26px;
      border: 1px solid transparent;
      border-radius: var(--theme-radius-sm);
      background: transparent;
      color: var(--theme-text-muted);
      font-size: 0.6rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--theme-transition);
    }

    .theme-btn:hover { background: var(--theme-surface-hover); color: var(--theme-text); }
    .theme-btn.active { background: var(--theme-primary-bg); border-color: var(--theme-primary); color: var(--theme-primary); }

    .user-badge {
      font-size: 0.65rem;
      padding: 0.2rem 0.55rem;
      border-radius: var(--theme-radius-sm);
      background: var(--theme-surface-hover);
      color: var(--theme-text-muted);
      font-weight: 600;
      letter-spacing: 0.06em;
    }

    .user-badge.master { background: var(--theme-primary-bg); color: var(--theme-primary); }

    .logout-btn { background: none; border: none; color: var(--theme-text-muted); font-size: 0.75rem; cursor: pointer; }
    .logout-btn:hover { color: var(--theme-primary); }
  `],
})
export class AppSidebarComponent {
  readonly auth = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  readonly collapsible = input(false);
  readonly toggled = output<void>();

  readonly navItems = NAV_ITEMS;

  isActive(route: string): boolean {
    return this.router.url.startsWith(route) && route !== '';
  }
}
