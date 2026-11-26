import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './config';
import {
  LoginResponse,
  Settings,
  SettingsInput,
  User,
  WorkerDetail,
  WorkerInput,
  WorkerListItem,
  WorkerStatus,
} from './models';

/** Thin promise-based wrapper over the Express API. One method per endpoint. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  private get<T>(path: string, params?: Record<string, string>) {
    return firstValueFrom(
      this.http.get<T>(`${API_URL}${path}`, {
        params: new HttpParams({ fromObject: params ?? {} }),
      }),
    );
  }
  private post<T>(path: string, body: unknown = {}) {
    return firstValueFrom(this.http.post<T>(`${API_URL}${path}`, body));
  }
  private put<T>(path: string, body: unknown) {
    return firstValueFrom(this.http.put<T>(`${API_URL}${path}`, body));
  }
  private patch<T>(path: string, body: unknown) {
    return firstValueFrom(this.http.patch<T>(`${API_URL}${path}`, body));
  }

  // auth
  login(email: string, password: string) {
    return this.post<LoginResponse>('/auth/login', { email, password });
  }
  me() {
    return this.get<User>('/auth/me');
  }

  // workers
  workers(status?: WorkerStatus) {
    return this.get<WorkerListItem[]>('/workers', status ? { status } : undefined);
  }
  worker(id: string) {
    return this.get<WorkerDetail>(`/workers/${id}`);
  }
  createWorker(body: WorkerInput) {
    return this.post<WorkerListItem>('/workers', body);
  }
  updateWorker(id: string, body: Partial<WorkerInput> & { status?: WorkerStatus }) {
    return this.patch<WorkerListItem>(`/workers/${id}`, body);
  }

  // settings
  settings() {
    return this.get<Settings | null>('/settings');
  }
  saveSettings(body: SettingsInput) {
    return this.put<Settings>('/settings', body);
  }
}
