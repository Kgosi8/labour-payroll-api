import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login/login').then((m) => m.Login) },
  {
    path: 'workers',
    canActivate: [authGuard],
    loadComponent: () => import('./features/workers/workers/workers').then((m) => m.Workers),
  },
  {
    path: 'settings',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/settings/settings/settings').then((m) => m.Settings),
  },
  { path: '', pathMatch: 'full', redirectTo: 'workers' },
  { path: '**', redirectTo: 'workers' },
];
