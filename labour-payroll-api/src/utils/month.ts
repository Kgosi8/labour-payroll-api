import { env } from "../config/env";

const offsetMs = () => env.BUSINESS_UTC_OFFSET_MINUTES * 60 * 1000;

/** 'YYYY-MM' of a date in the business's local time. */
export function monthKey(d: Date): string {
  const local = new Date(d.getTime() + offsetMs());
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** [start, end) of a business-local month, as UTC instants. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1) - offsetMs()),
    end: new Date(Date.UTC(y, m, 1) - offsetMs()),
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** '05 Nov 2026' in business-local time. */
export function formatLocalDate(d: Date): string {
  const l = new Date(d.getTime() + offsetMs());
  return `${String(l.getUTCDate()).padStart(2, "0")} ${MONTHS[l.getUTCMonth()]} ${l.getUTCFullYear()}`;
}

/** '05 Nov 2026 14:30' in business-local time. */
export function formatLocalDateTime(d: Date): string {
  const l = new Date(d.getTime() + offsetMs());
  const hh = String(l.getUTCHours()).padStart(2, "0");
  const mm = String(l.getUTCMinutes()).padStart(2, "0");
  return `${formatLocalDate(d)} ${hh}:${mm}`;
}
