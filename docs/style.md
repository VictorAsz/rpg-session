# RPG Session — Style Guide & Theme System

> **Regra de ouro**: toda cor, borda, sombra e espaçamento deve vir de uma CSS variable do tema. Nunca usar valores hardcoded (`#1e2235`, `0.15s`, etc.) em componentes.

---

## 1. Temas disponíveis

| Key | Nome | Visual |
|-----|------|--------|
| `dark` | Dark | Fundo escuro, accent vermelho — visual padrão |
| `pastel` | Pergaminho | Fundo bege, tons marrons quentes, medieval claro |
| `midnight` | Meia-Noite | Fundo quase preto, blue/purple accents, glow |

Tema é aplicado via atributo `data-theme="dark|pastel|midnight"` no `<html>`.  
**ThemeService** (`core/services/theme.service.ts`) gerencia troca e persiste em `localStorage`.

### Adicionando o seletor de tema

Injetar `ThemeService` e expor a lista no template:

```typescript
readonly themeService = inject(ThemeService);
```

```html
<div class="theme-switcher">
  @for (t of themeService.themes; track t.value) {
    <button class="theme-btn"
      [class.active]="themeService.current() === t.value"
      [innerHTML]="t.icon"
      (click)="themeService.set(t.value)"
    ></button>
  }
</div>
```

---

## 2. CSS Variables — catálogo completo

### Superfície & Fundo
| Variable | Propósito |
|----------|-----------|
| `--theme-bg` | Fundo da página |
| `--theme-surface` | Cards, painéis, modais |
| `--theme-surface-hover` | Hover de itens de lista, nav items |
| `--theme-border` | Bordas principais |
| `--theme-border-light` | Bordas sutis (separadores de sidebar) |

### Texto
| Variable | Propósito |
|----------|-----------|
| `--theme-text` | Texto corpo |
| `--theme-text-muted` | Labels, descrições |
| `--theme-text-dim` | Placeholders, estados vazios |
| `--theme-heading` | Títulos (h1-h4) |

### Ação & Accent
| Variable | Propósito |
|----------|-----------|
| `--theme-primary` | Cor principal (botões, links, active) |
| `--theme-primary-hover` | Hover do primary |
| `--theme-primary-bg` | Background sutil do primary (badges, nav active) |
| `--theme-accent-gold` | Valores monetários, destaque |
| `--theme-accent-green` | Efeitos positivos, sucesso |
| `--theme-accent-blue` | Mana, magia |
| `--theme-accent-purple` | Destaque alternativo |

### Inputs & Modais
| Variable | Propósito |
|----------|-----------|
| `--theme-input-bg` | Fundo de input/textarea/select |
| `--theme-input-border` | Borda de input |
| `--theme-input-focus` | Borda ao focar (usa `--theme-primary`) |
| `--theme-modal-bg` | Fundo do modal |
| `--theme-modal-backdrop` | Overlay do modal |

### Sombras & Efeitos
| Variable | Propósito |
|----------|-----------|
| `--theme-shadow-sm` | Sombra leve |
| `--theme-shadow-md` | Sombra média (cards hover) |
| `--theme-shadow-lg` | Sombra pesada |

### Layout
| Variable | Propósito |
|----------|-----------|
| `--theme-sidebar-width` | Largura do sidebar (220px) |
| `--theme-sidebar-bg` | Fundo do sidebar |
| `--theme-sidebar-border` | Borda direita do sidebar |

### Tipografia & Forma
| Variable | Propósito |
|----------|-----------|
| `--theme-font` | Fonte principal (`'Inter', system-ui, sans-serif`) |
| `--theme-font-mono` | Fonte monospace (`'JetBrains Mono', monospace`) |
| `--theme-transition` | Duração de transições (`0.15s ease`) |
| `--theme-radius-sm` | Bordas pequenas (4px) |
| `--theme-radius-md` | Bordas médias (8px) |
| `--theme-radius-lg` | Bordas grandes (12px) |

---

## 3. Sidebar — padrão obrigatório

Todo componente com sidebar deve seguir esta estrutura de classes:

```html
<aside class="sidebar">
  <a class="sb-back" routerLink="/stage">&#8592; Stage</a>
  <h1 class="sb-title">Título da Página</h1>

  <nav class="sb-nav">
    <a class="sb-item active" routerLink="/rota">Item</a>
    <a class="sb-item" routerLink="/outra">Outro</a>
  </nav>

  <div class="sb-footer">
    <span class="sb-badge" [class.master]="auth.isMaster()">
      {{ auth.isMaster() ? 'MESTRE' : 'JOGADOR' }}
    </span>
    <button class="sb-logout" (click)="auth.signOut()">Sair</button>
  </div>
</aside>
```

### CSS mínimo obrigatório

```scss
.sidebar {
  width: var(--theme-sidebar-width);
  background: var(--theme-sidebar-bg);
  border-right: 1px solid var(--theme-sidebar-border);
  display: flex; flex-direction: column;
  padding: 1.25rem;
  flex-shrink: 0;
}
.sb-back { color: var(--theme-text-muted); font-size: 0.75rem; text-decoration: none; }
.sb-back:hover { color: var(--theme-primary); }
.sb-title { color: var(--theme-primary); font-size: 1.05rem; font-weight: 700; margin: 0 0 1rem; }
.sb-nav { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
.sb-item {
  padding: 0.5rem 0.75rem; border-radius: var(--theme-radius-sm);
  color: var(--theme-text-muted); font-size: 0.825rem; text-decoration: none;
  transition: all var(--theme-transition);
}
.sb-item:hover { background: var(--theme-surface-hover); color: var(--theme-text); }
.sb-item.active { background: var(--theme-primary-bg); color: var(--theme-primary); }
.sb-footer {
  margin-top: auto; border-top: 1px solid var(--theme-border);
  padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center;
}
.sb-badge { font-size: 0.6rem; background: var(--theme-surface-hover); color: var(--theme-text-muted); padding: 0.15rem 0.5rem; border-radius: 3px; font-weight: 600; }
.sb-badge.master { background: var(--theme-primary-bg); color: var(--theme-primary); }
.sb-logout { background: none; border: none; color: var(--theme-text-muted); cursor: pointer; font-size: 0.7rem; }
.sb-logout:hover { color: var(--theme-primary); }
```

---

## 4. Botões — convenção

```scss
// Primário
.btn-primary {
  background: var(--theme-primary);
  color: #fff;
  border: none;
  border-radius: var(--theme-radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--theme-transition);
}
.btn-primary:hover:not(:disabled) { background: var(--theme-primary-hover); box-shadow: var(--theme-shadow-sm); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

// Ghost / Secundário
.btn-ghost {
  background: transparent;
  color: var(--theme-text-muted);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-radius-sm);
  cursor: pointer;
  transition: all var(--theme-transition);
}
.btn-ghost:hover { background: var(--theme-surface-hover); color: var(--theme-text); }

// Pequeno (inline actions)
.btn-sm {
  background: var(--theme-surface);
  color: var(--theme-text-muted);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-radius-sm);
  font-size: 0.72rem;
  cursor: pointer;
  transition: all var(--theme-transition);
}
.btn-sm:hover { border-color: var(--theme-primary); color: var(--theme-text); }
.btn-sm.danger { color: var(--theme-primary); }
.btn-sm.danger:hover { background: var(--theme-primary-bg); }

// Ícone (× fechar, etc.)
.icon-btn {
  width: 28px; height: 28px;
  background: transparent; border: none;
  color: var(--theme-text-muted);
  border-radius: var(--theme-radius-sm);
  cursor: pointer;
  transition: all var(--theme-transition);
}
.icon-btn:hover { background: var(--theme-surface-hover); }
.icon-btn.danger:hover { background: var(--theme-primary-bg); color: var(--theme-primary); }
```

---

## 5. Inputs & Formulários

```scss
input, textarea, select {
  background: var(--theme-input-bg);
  border: 1px solid var(--theme-input-border);
  border-radius: var(--theme-radius-sm);
  color: var(--theme-text);
  padding: 0.45rem 0.6rem;
  font-family: inherit; font-size: 0.8rem;
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--theme-input-focus);
}
label {
  display: flex; flex-direction: column; gap: 0.25rem;
  font-size: 0.7rem; color: var(--theme-text-muted);
}
```

---

## 6. Modais

```scss
.modal-backdrop {
  position: fixed; inset: 0;
  background: var(--theme-modal-backdrop);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--theme-modal-bg);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-radius-lg);
  padding: 1.5rem;
  max-width: 90vw;
}
```

---

## 7. Cards

```scss
.card {
  background: var(--theme-surface);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-radius-md);
  padding: 0.9rem;
  transition: all var(--theme-transition);
}
.card:hover {
  border-color: color-mix(in srgb, var(--theme-primary) 30%, var(--theme-border));
  box-shadow: var(--theme-shadow-md);
  transform: translateY(-1px);
}
```

---

## 8. Lista de verificação para novas telas

- [ ] Nenhuma cor hardcoded — todas via `var(--theme-*)`
- [ ] Sidebar segue padrão de classes (`sb-*`)
- [ ] Botões usam classes `btn-primary`, `btn-ghost`, `btn-sm`
- [ ] Inputs usam `var(--theme-input-bg)` e `var(--theme-input-border)`
- [ ] Modais usam `var(--theme-modal-bg)` e `var(--theme-modal-backdrop)`
- [ ] Transições usam `var(--theme-transition)`
- [ ] Bordas arredondadas usam `var(--theme-radius-*)`
- [ ] Fontes usam `var(--theme-font)` e `var(--theme-font-mono)`
- [ ] Sombras usam `var(--theme-shadow-*)`
- [ ] Testar nos 3 temas (`dark`, `pastel`, `midnight`)

---

## 9. Exemplo: criando uma tela nova

```typescript
@Component({
  selector: 'app-nova-tela',
  imports: [RouterLink, AsyncPipe, ReactiveFormsModule],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <a class="sb-back" routerLink="/stage">&#8592; Stage</a>
        <h1 class="sb-title">Nova Tela</h1>
        <nav class="sb-nav">
          <a class="sb-item active">Aba 1</a>
        </nav>
        <div class="sb-footer">
          <span class="sb-badge" [class.master]="auth.isMaster()">
            {{ auth.isMaster() ? 'MESTRE' : 'JOGADOR' }}
          </span>
          <button class="sb-logout" (click)="auth.signOut()">Sair</button>
        </div>
      </aside>

      <main class="main">
        <header class="header">
          <h2>Título</h2>
          <button class="btn-primary">+ Novo</button>
        </header>
        <!-- conteúdo -->
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100dvh; background: var(--theme-bg); color: var(--theme-text); font-family: var(--theme-font); }
    .layout { display: flex; height: 100%; }
    /* ... sidebar padrão + main ... */
  `],
})
export class NovaTelaComponent {
  readonly auth = inject(AuthService);
}
```
