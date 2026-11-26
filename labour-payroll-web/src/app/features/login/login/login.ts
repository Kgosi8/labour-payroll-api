import { Component, inject, signal } from '@angular/core';
import { Auth } from '../../../core/auth';
import { Router } from '@angular/router';
import { errorMessage } from '../../../core/errors';

@Component({
  imports: [],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly form = signal({ email: '', password: '' });
  readonly busy = signal(false);
  readonly error = signal('');

  updateField(field: 'email' | 'password', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  async submit(event: Event) {
    event.preventDefault();
    const { email, password } = this.form();
    if (!email.trim() || !password) {
      this.error.set('Enter your email and password.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(email.trim(), password);
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
