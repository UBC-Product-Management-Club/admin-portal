/** All dates are shown in UTC to match how they're stored (HLD 3.3). */
const TIME_ZONE = "UTC";

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
});
const shortDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
});
const monthYearFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  month: "long",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const currencyFormat = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const DAY_MS = 24 * 60 * 60 * 1000;

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatShortDate = (iso: string) =>
  shortDateFormat.format(new Date(iso));
export const formatMonthYear = (iso: string) =>
  monthYearFormat.format(new Date(iso));
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));
export const formatCurrency = (amount: number) => currencyFormat.format(amount);

export function monthAbbreviation(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: TIME_ZONE,
    month: "short",
  });
}

export function dayOfMonth(iso: string) {
  return new Date(iso).getUTCDate();
}

/** "In 3 days" / "Tomorrow" / "Today", for upcoming events. */
export function formatRelativeDays(iso: string, now = new Date()) {
  const days = Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `In ${days} days`;
  return `In ${Math.round(days / 7)} weeks`;
}

/** School years run September to August, e.g. "2026-2027". */
export function schoolYearOf(iso: string) {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const startYear = date.getUTCMonth() >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function initials(firstName: string, lastName = "") {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
