import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

@Injectable()
export abstract class Store<TState> {
  protected readonly state$: BehaviorSubject<TState>;
  protected readonly destroy$ = new Subject<void>();

  constructor(initialState: TState) {
    this.state$ = new BehaviorSubject<TState>(initialState);
  }

  get snapshot(): TState {
    return this.state$.getValue();
  }

  patch(partial: Partial<TState>): void {
    this.state$.next({ ...this.snapshot, ...partial });
  }

  protected select<R>(project: (state: TState) => R): Observable<R> {
    return this.state$.pipe(
      map(project),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    );
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.state$.complete();
  }
}
