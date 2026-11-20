/** Dates are stored in UTC but shown and edited in Vancouver time, where PMC runs. */
export const TIME_ZONE = "America/Vancouver";

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
// Deadlines carry the zone name (PST/PDT) so there's no doubt which time is meant.
const vancouverFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});
const partsFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
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
export const formatVancouverTime = (iso: string) =>
  vancouverFormat.format(new Date(iso));
export const formatCurrency = (amount: number) => currencyFormat.format(amount);

export function monthAbbreviation(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: TIME_ZONE,
    month: "short",
  });
}

export function dayOfMonth(iso: string) {
  return wallClock(iso).day;
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
  const { year, month } = wallClock(iso);
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/** The Vancouver calendar date and time of an instant, as numbers (month is 1-12). */
export function wallClock(iso: string | Date) {
  const parts = Object.fromEntries(
    partsFormat
      .formatToParts(new Date(iso))
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

export function initials(firstName: string, lastName = "") {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
