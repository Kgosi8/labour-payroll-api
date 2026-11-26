import { HttpErrorResponse } from '@angular/common/http';

/** Turns whatever the API (or the network) threw into a sentence you can show a person. */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Check the connection and try again.';
    const e = err.error?.error;
    if (e) {
      if (e.code === 'VALIDATION_ERROR') {
        const fields = (e.details?.fieldErrors ?? {}) as Record<string, string[]>;
        const first = Object.entries(fields)[0];
        if (first) return `${first[0]}: ${first[1][0]}`;
        const form = e.details?.formErrors?.[0];
        if (form) return form;
      }
      return e.message ?? 'Something went wrong.';
    }
  }
  return 'Something went wrong. Please try again.';
}
