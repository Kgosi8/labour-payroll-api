import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Api } from './api';
import { Role, User } from './models';

const TOKEN_KEY = 'lp_token';
const USER_KEY = 'lp_user';

function readUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(readUser());
  readonly isLoggedIn = computed(() => !!this.user());
  readonly isAdmin = computed(() => this.user()?.role === 'admin');
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  async login(email: string, password: string): Promise<void> {
    const res = await this.api.login(email, password);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.user.set(res.user);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }
}
