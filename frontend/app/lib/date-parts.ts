/** Split date + time fields, treated as UTC (HLD 3.3 "Date and time editing"). */
export type DateTimeParts = { date: string; time: string };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function toDateTimeParts(iso: string | null): DateTimeParts {
  if (!iso) return { date: "", time: "" };
  const value = new Date(iso).toISOString();
  return { date: value.slice(0, 10), time: value.slice(11, 16) };
}

/** True for real calendar dates only (JS would roll Feb 30 into Mar 2). */
export function isValidDate(date: string) {
  const match = DATE_PATTERN.exec(date);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Returns an ISO UTC timestamp, or null when the parts aren't a real moment. */
export function fromDateTimeParts({
  date,
  time,
}: DateTimeParts): string | null {
  if (!isValidDate(date) || !TIME_PATTERN.test(time)) return null;
  return `${date}T${time}:00.000Z`;
}
