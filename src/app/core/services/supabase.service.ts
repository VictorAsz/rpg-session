import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import type { BaseEntity } from '../../shared/models/base-entity.model';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async fetchAll<T extends BaseEntity>(
    table: string,
    opts?: { column?: string; value?: string },
  ): Promise<T[]> {
    let q = this.client.from(table).select('*');
    if (opts?.column && opts?.value) {
      q = q.eq(opts.column, opts.value);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as T[];
  }

  async fetchById<T extends BaseEntity>(table: string, id: string): Promise<T> {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as T;
  }

  async insert<T extends BaseEntity>(table: string, payload: Partial<T>): Promise<T> {
    const { data, error } = await this.client
      .from(table)
      .insert(payload as Record<string, unknown>)
      .select()
      .single();
    if (error) throw error;
    return data as T;
  }

  async update<T extends BaseEntity>(
    table: string,
    id: string,
    payload: Partial<T>,
  ): Promise<T> {
    const { data, error } = await this.client
      .from(table)
      .update(payload as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as T;
  }

  async delete(table: string, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq('id', id);
    if (error) throw error;
  }
}
