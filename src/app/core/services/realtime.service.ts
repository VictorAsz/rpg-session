import { Injectable, OnDestroy } from '@angular/core';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { BaseEntity } from '../../shared/models/base-entity.model';
import type { RealtimeEvent } from '../../shared/models/realtime-event.model';

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private readonly supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly connected$ = new ReplaySubject<void>(1);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  connect(channelName = 'default'): void {
    this.disconnect();
    this.channel = this.supabase.channel(channelName);
    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.connected$.next();
      }
    });
  }

  disconnect(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  onChanges<T extends BaseEntity>(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
  ): Observable<RealtimeEvent<T>> {
    return this.connected$.pipe(
      take(1),
      switchMap(() => this.setupChanges<T>(table, event)),
      takeUntil(this.destroy$),
    );
  }

  private setupChanges<T extends BaseEntity>(
    table: string,
    event: string,
  ): Observable<RealtimeEvent<T>> {
    return new Observable((subscriber) => {
      const channel = this.supabase.channel(`realtime:${table}`);

      channel.on('postgres_changes' as any, { event, schema: 'public', table }, (payload: any) => {
        subscriber.next({
          event: payload.eventType,
          old: payload.old,
          new: payload.new,
        });
      });

      channel.subscribe();

      return () => {
        channel.unsubscribe();
      };
    });
  }

  broadcast<T>(event: string, payload: T): void {
    if (!this.channel) return;
    this.channel
      .send({ type: 'broadcast', event, payload: payload as Record<string, unknown> })
      .catch(() => {});
  }

  onBroadcast<T>(event: string): Observable<T> {
    return this.connected$.pipe(
      take(1),
      switchMap(() => this.setupBroadcast<T>(event)),
      takeUntil(this.destroy$),
    );
  }

  private setupBroadcast<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      this.channel!.on(
        'broadcast',
        { event },
        (payload: { [key: string]: unknown; type: string; event: string; payload: unknown }) => {
          subscriber.next(payload['payload'] as T);
        },
      );
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
