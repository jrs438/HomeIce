export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfWeek(d: Date): Date {
  const copy = startOfDay(d);
  const day = copy.getDay();
  return addDays(copy, -day);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Interprets "YYYY-MM-DDTHH:mm[:ss]" as wall-clock time in `timeZone` (DST-aware)
 * and returns the corresponding instant. Needed because the server runtime's own
 * local timezone (UTC on Vercel) is not the family's timezone, so a naive
 * `new Date("2026-07-27T17:00:00")` on the server does not mean 5pm Eastern.
 */
export function zonedTimeToUtc(dateTimeStr: string, timeZone: string): Date {
  const [datePart, timePart = "00:00:00"] = dateTimeStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map((n) => Number(n) || 0);

  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, second || 0);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(guessUtcMs))) parts[p.type] = p.value;
  const renderedAsUtcMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const driftMs = renderedAsUtcMs - guessUtcMs;
  return new Date(guessUtcMs - driftMs);
}

/**
 * Parses a datetime string that may or may not carry a UTC/offset designator.
 * If it does (trailing "Z" or "+hh:mm"/"-hh:mm"), it's treated as an absolute
 * instant as usual. Otherwise it's treated as wall-clock time in `timeZone`.
 */
export function parseWallClockOrUtc(dateTimeStr: string, timeZone: string): Date {
  if (/Z$|[+-]\d{2}:\d{2}$/.test(dateTimeStr)) {
    return new Date(dateTimeStr);
  }
  return zonedTimeToUtc(dateTimeStr, timeZone);
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Whether `day` falls on an active week for a rule recurring every `intervalWeeks` weeks from `anchorDate`. */
export function isOnRecurrenceCycle(day: Date, intervalWeeks: number, anchorDate: string | null): boolean {
  if (intervalWeeks <= 1 || !anchorDate) return true;
  const anchorWeek = startOfWeek(new Date(`${anchorDate}T00:00:00`));
  const dayWeek = startOfWeek(day);
  const weeksSince = Math.round((dayWeek.getTime() - anchorWeek.getTime()) / WEEK_MS);
  return weeksSince >= 0 && weeksSince % intervalWeeks === 0;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
