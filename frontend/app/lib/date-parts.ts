import { wallClock } from "~/lib/format";

/** Split date + time fields, entered and shown in Vancouver time (stored as UTC). */
export type DateTimeParts = { date: string; time: string };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateTimeParts(iso: string | null): DateTimeParts {
  if (!iso) return { date: "", time: "" };
  const { year, month, day, hour, minute } = wallClock(iso);
  return {
    date: `${year}-${pad(month)}-${pad(day)}`,
    time: `${pad(hour)}:${pad(minute)}`,
  };
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
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Shift by Vancouver's offset, then again in case that crossed a DST change.
  let instant = asUtc - offsetAt(asUtc);
  instant = asUtc - offsetAt(instant);
  return new Date(instant).toISOString();
}

/** Vancouver's offset from UTC at an instant, in ms (e.g. -7h during PDT). */
function offsetAt(instant: number) {
  const { year, month, day, hour, minute } = wallClock(new Date(instant));
  const seconds = new Date(instant).getUTCSeconds();
  const ms = new Date(instant).getUTCMilliseconds();
  return Date.UTC(year, month - 1, day, hour, minute, seconds, ms) - instant;
}
