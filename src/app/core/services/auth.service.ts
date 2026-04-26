import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import type { UserRole } from '../../shared/models/rpg-models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly router = inject(Router);

  readonly authReady = signal(false);
  readonly session = signal<Session | null>(null);
  readonly supabaseUser = signal<SupabaseUser | null>(null);
  readonly isAuthenticated = signal(false);
  readonly isMaster = signal(false);

  readonly currentUserId = signal<string | null>(null);

  constructor() {
    this.restoreSession();
  }

  private async restoreSession(): Promise<void> {
    try {
      const { data } = await this.supabase.auth.getSession();
      this.session.set(data.session);
      this.supabaseUser.set(data.session?.user ?? null);
      this.isAuthenticated.set(!!data.session);

      if (data.session?.user) {
        await this.syncUserWithDatabase(data.session.user);
      }
    } finally {
      this.authReady.set(true);
    }

    this.supabase.auth.onAuthStateChange(async (event, session) => {
      this.session.set(session);
      this.supabaseUser.set(session?.user ?? null);
      this.isAuthenticated.set(!!session);

      if (session?.user) {
        await this.syncUserWithDatabase(session.user);
      }

      if (event === 'SIGNED_OUT') {
        this.isMaster.set(false);
        this.currentUserId.set(null);
        this.router.navigate(['/login']);
      }
    });
  }

  private async syncUserWithDatabase(supabaseUser: SupabaseUser): Promise<void> {
    const userId = supabaseUser.id;
    const email = supabaseUser.email ?? supabaseUser.user_metadata?.['email'] ?? 'unknown';

    // Upsert: garante que existe uma linha na tabela users com mesmo id do auth
    await this.upsertUser(userId, email);

    // Carrega o role da tabela users
    await this.loadUserRole(userId);
  }

  private async loadUserRole(userId: string): Promise<void> {
    try {
      const { data } = await this.supabase.from('users').select('role').eq('id', userId).single();

      this.isMaster.set(data?.role === 'master');
      this.currentUserId.set(userId);
    } catch {
      this.isMaster.set(false);
      this.currentUserId.set(userId);
    }
  }

  async signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      this.router.navigate(['/table']);
    }
    return { error };
  }

  async signUp(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (!error && data.user) {
      await this.upsertUser(data.user.id, email);
      await this.loadUserRole(data.user.id);
      this.router.navigate(['/table']);
    }
    return { error };
  }

  public async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
  private async upsertUser(id: string, email: string): Promise<void> {
    try {
      const { data: existing } = await this.supabase
        .from('users')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (existing) {
        // Usuário já existe — só atualiza o nome, NUNCA sobrescreve o role
        await this.supabase.from('users').update({ name: email }).eq('id', id);
      } else {
        // Novo usuário — primeiro da tabela vira master
        const { count } = await this.supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        const role: UserRole = (count ?? 0) === 0 ? 'master' : 'player';

        await this.supabase.from('users').insert({
          id,
          name: email,
          password: '',
          role,
        });
      }
    } catch {
      // silently fail
    }
  }
}
