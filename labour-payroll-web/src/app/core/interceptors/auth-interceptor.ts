import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Auth } from '../auth';
import { throwError } from 'rxjs/internal/observable/throwError';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/internal/operators/catchError';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = auth.token;
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      const isLogin = req.url.endsWith('/auth/login');
      if (err instanceof HttpErrorResponse && err.status === 401 && !isLogin) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
