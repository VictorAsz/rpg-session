import { Injectable, OnDestroy } from '@angular/core';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { BaseEntity } from '../../shared/models/base-entity.model';
import type { RealtimeEvent } from '../../shared/models/realtime-event.model';

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private readonly supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  connect(sessionId: string): void {
    this.disconnect();
    this.channel = this.supabase.channel(`session:${sessionId}`);
  }

  disconnect(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  subscribeToChannel(): void {
    if (!this.channel) return;
    this.channel.subscribe();
  }

  onChanges<T extends BaseEntity>(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
  ): Observable<RealtimeEvent<T>> {
    return new Observable<RealtimeEvent<T>>((subscriber) => {
      if (!this.channel) {
        subscriber.error(new Error('Channel not connected. Call connect() first.'));
        return;
      }

      this.channel.on(
        'postgres_changes',
        { event, schema: 'public', table },
        (payload) => {
          subscriber.next({
            event: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            old: payload.old as T,
            new: payload.new as T,
          });
        },
      );
    }).pipe(takeUntil(this.destroy$));
  }

  broadcast<T>(event: string, payload: T): void {
    if (!this.channel) return;
    this.channel
      .send({ type: 'broadcast', event, payload: payload as Record<string, unknown> })
      .catch(() => {});
  }

  onBroadcast<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      if (!this.channel) {
        subscriber.error(new Error('Channel not connected. Call connect() first.'));
        return;
      }

      this.channel.on('broadcast', { event }, (payload) => {
        subscriber.next(payload['payload'] as T);
      });
    }).pipe(takeUntil(this.destroy$));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
