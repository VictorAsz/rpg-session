import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly router = inject(Router);

  readonly session = signal<Session | null>(null);
  readonly user = signal<User | null>(null);

  readonly isAuthenticated = signal(false);
  readonly isMaster = signal(false);

  constructor() {
    this.restoreSession();
  }

  private async restoreSession(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this.session.set(data.session);
    this.user.set(data.session?.user ?? null);
    this.isAuthenticated.set(!!data.session);

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
      this.isAuthenticated.set(!!session);

      if (event === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }
    });
  }

  async signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      this.router.navigate(['/table']);
    }
    return { error };
  }

  async signUp(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signUp({ email, password });
    if (!error) {
      this.router.navigate(['/table']);
    }
    return { error };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
