export function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function nextWeekKey(key: string): string {
  const [yearStr, weekStr] = key.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  // Jump forward 7 days from a date in the current week to compute the next key robustly.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const weekStart = new Date(jan4);
  weekStart.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1 + (week - 1) * 7);
  const nextWeekDate = new Date(weekStart);
  nextWeekDate.setUTCDate(weekStart.getUTCDate() + 7);
  return isoWeekKey(nextWeekDate);
}
