export type ParsedIcsEvent = {
  uid: string;
  summary: string;
  location: string | null;
  description: string | null;
  start: Date;
  end: Date | null;
  allDay: boolean;
  cancelled: boolean;
};

function unfold(text: string): string[] {
  const rawLines = text.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseDateValue(propLine: string, value: string): { date: Date; allDay: boolean } {
  const allDay = /VALUE=DATE(?!-TIME)/.test(propLine) || /^\d{8}$/.test(value);
  if (allDay) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    return { date: new Date(y, m, d), allDay: true };
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return { date: new Date(value), allDay: false };
  const [, y, mo, d, h, mi, s, z] = match;
  if (z === "Z") {
    return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)), allDay: false };
  }
  return { date: new Date(+y, +mo - 1, +d, +h, +mi, +s), allDay: false };
}

export function parseIcs(text: string): ParsedIcsEvent[] {
  const lines = unfold(text);
  const events: ParsedIcsEvent[] = [];
  let current: Record<string, string> | null = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      if (current && current.UID && current.DTSTART) {
        const startInfo = parseDateValue(current.DTSTART_LINE ?? "", current.DTSTART);
        const endInfo = current.DTEND ? parseDateValue(current.DTEND_LINE ?? "", current.DTEND) : null;
        events.push({
          uid: current.UID,
          summary: current.SUMMARY || "(untitled)",
          location: current.LOCATION || null,
          description: current.DESCRIPTION || null,
          start: startInfo.date,
          end: endInfo?.date ?? null,
          allDay: startInfo.allDay,
          cancelled: (current.STATUS || "").toUpperCase() === "CANCELLED",
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(";")[0].toUpperCase();

    if (key === "UID") current.UID = value;
    else if (key === "SUMMARY") current.SUMMARY = value.replace(/\\,/g, ",").replace(/\\n/gi, " ");
    else if (key === "LOCATION") current.LOCATION = value.replace(/\\,/g, ",");
    else if (key === "DESCRIPTION") current.DESCRIPTION = value.replace(/\\,/g, ",").replace(/\\n/gi, " ");
    else if (key === "STATUS") current.STATUS = value;
    else if (key === "DTSTART") {
      current.DTSTART = value;
      current.DTSTART_LINE = rawKey;
    } else if (key === "DTEND") {
      current.DTEND = value;
      current.DTEND_LINE = rawKey;
    }
  }

  return events;
}
