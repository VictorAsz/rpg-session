import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-container">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="login-form">
        <h1>RPG Session</h1>

        <label>
          Email
          <input type="email" formControlName="email" placeholder="seu@email.com" />
        </label>

        <label>
          Senha
          <input type="password" formControlName="password" placeholder="••••••••" />
        </label>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <button type="submit" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Entrando...' : 'Entrar' }}
        </button>

        <button type="button" class="secondary" (click)="onSignUp()" [disabled]="form.invalid || loading()">
          Criar conta
        </button>
      </form>
    </div>
  `,
  styles: `
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100dvh;
      background: var(--theme-bg);
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      max-width: 360px;
      padding: 2rem;
      background: var(--theme-surface);
      border-radius: var(--theme-radius-lg);
      border: 1px solid var(--theme-border);
    }

    h1 {
      text-align: center;
      color: var(--theme-primary);
      margin: 0 0 1rem;
      font-size: 1.75rem;
      font-family: var(--theme-font);
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      color: var(--theme-text-muted);
      font-size: 0.875rem;
      font-family: var(--theme-font);
    }

    input {
      padding: 0.625rem;
      border: 1px solid var(--theme-input-border);
      border-radius: var(--theme-radius-sm);
      background: var(--theme-input-bg);
      color: var(--theme-text);
      font-size: 0.9rem;
      font-family: var(--theme-font);
    }

    input:focus {
      outline: none;
      border-color: var(--theme-input-focus);
    }

    button {
      padding: 0.75rem;
      border: none;
      border-radius: var(--theme-radius-sm);
      background: var(--theme-primary);
      color: #fff;
      font-size: 1rem;
      cursor: pointer;
      transition: background var(--theme-transition);
      font-family: var(--theme-font);
    }

    button:hover:not(:disabled) { background: var(--theme-primary-hover); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    button.secondary {
      background: transparent;
      border: 1px solid var(--theme-border);
      color: var(--theme-text-muted);
    }

    button.secondary:hover:not(:disabled) { background: var(--theme-surface-hover); }

    .error {
      color: var(--theme-primary);
      font-size: 0.8rem;
      text-align: center;
      margin: 0;
    }
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);

  readonly form = inject(FormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    const { error } = await this.authService.signIn(email!, password!);

    this.loading.set(false);
    if (error) {
      this.error.set(error.message);
    }
  }

  async onSignUp(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    const { error } = await this.authService.signUp(email!, password!);

    this.loading.set(false);
    if (error) {
      this.error.set(error.message);
    }
  }
}
