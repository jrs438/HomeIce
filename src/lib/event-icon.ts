import { Snowflake, Music, Dumbbell, GraduationCap, Utensils, CalendarDays, type LucideIcon } from "lucide-react";

const KEYWORD_ICONS: [RegExp, LucideIcon][] = [
  [/hockey/i, Snowflake],
  [/dance/i, Music],
  [/gymnastic/i, Dumbbell],
  [/school|pickup|drop.?off|carpool/i, GraduationCap],
  [/dinner|lunch|breakfast|meal/i, Utensils],
];

export function iconForEvent(title: string): LucideIcon {
  for (const [pattern, icon] of KEYWORD_ICONS) {
    if (pattern.test(title)) return icon;
  }
  return CalendarDays;
}
