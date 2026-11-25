const SHORT_MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/** 'November 2026' from '2026-11'. */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Bank statement reference, kept within 20 characters (a common limit), e.g. 'RDP NOV26 J SMITH'.
 * Format: 'RDP MMMYY ' (10 chars) + initial + surname, upper-case A-Z/0-9, truncated.
 */
export function buildReference(
  month: string,
  firstName: string,
  lastName: string,
): string {
  const [y, m] = month.split("-").map(Number);
  const prefix = `RDP ${SHORT_MONTHS[m - 1]}${String(y).slice(-2)} `;
  const clean = (s: string) =>
    s
      .toUpperCase()
      .normalize("NFD")
      .replace(/[^A-Z0-9]/g, "");
  const tail = `${clean(firstName).slice(0, 1)} ${clean(lastName)}`
    .trim()
    .slice(0, 20 - prefix.length)
    .trim();
  return (prefix + tail).trim();
}
