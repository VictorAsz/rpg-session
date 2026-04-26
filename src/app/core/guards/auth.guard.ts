import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

export function authGuard(): Observable<boolean | UrlTree> {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.authReady).pipe(
    filter((ready) => ready),
    take(1),
    map(() => {
      if (auth.isAuthenticated()) {
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
  );
}
