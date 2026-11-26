/** Money is always integer cents in the API. Convert only at the edges (inputs and display). */

export function formatRand(cents: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(cents / 100);
}

/** 1150000 -> '11500.00' (for an input's value). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** '11 500,50' or '11500.50' -> 1150050. Returns NaN when it is not a number. */
export function randToCents(value: string): number {
  const n = Number(value.replace(/\s/g, '').replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** '33.33' -> 3333 basis points. Returns NaN when it is not a number. */
export function pctToBps(value: string): number {
  const n = Number(value.replace(/\s/g, '').replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** 3333 -> '33.33'. */
export function bpsToPct(bps: number): string {
  return String(bps / 100);
}
