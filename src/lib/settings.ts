import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SETTINGS_DEFAULTS = {
  family_name: "The Spiers",
  family_password: "homeice",
  grocery_stores: JSON.stringify(["Costco", "BJ's", "ShopRite", "Cedar Market", "Grand", "Ouris"]),
  candle_lighting_zip: "07652",
  digest_day: "sunday",
  digest_time: "18:00",
  sitter_name: "Sitter (TBD)",
} as const;

export type SettingsKey = keyof typeof SETTINGS_DEFAULTS;

export async function getSetting<K extends SettingsKey>(key: K): Promise<(typeof SETTINGS_DEFAULTS)[K]> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  if (!row) return SETTINGS_DEFAULTS[key];
  return (row.value as { value: (typeof SETTINGS_DEFAULTS)[K] }).value ?? SETTINGS_DEFAULTS[key];
}

export async function getAllSettings(): Promise<Record<SettingsKey, string>> {
  const rows = await db.query.settings.findMany();
  const map = new Map(rows.map((r) => [r.key, (r.value as { value: string }).value]));
  const result = {} as Record<SettingsKey, string>;
  for (const key of Object.keys(SETTINGS_DEFAULTS) as SettingsKey[]) {
    result[key] = map.get(key) ?? SETTINGS_DEFAULTS[key];
  }
  return result;
}

export async function setSetting(key: SettingsKey, value: string) {
  await db
    .insert(settings)
    .values({ key, value: { value } })
    .onConflictDoUpdate({ target: settings.key, set: { value: { value } } });
}
