import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting, SettingsKey, SETTINGS_DEFAULTS } from "@/lib/settings";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const all = await getAllSettings();
  return NextResponse.json(all);
}

export async function PATCH(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = (await req.json()) as Record<string, string>;
  const validKeys = Object.keys(SETTINGS_DEFAULTS) as SettingsKey[];
  for (const [key, value] of Object.entries(body)) {
    if (validKeys.includes(key as SettingsKey) && typeof value === "string") {
      await setSetting(key as SettingsKey, value);
    }
  }
  const all = await getAllSettings();
  return NextResponse.json(all);
}
