/** All money in the system is stored as integer cents. Format only at the edges (PDFs, UI). */
export function formatRand(cents: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(cents / 100);
}