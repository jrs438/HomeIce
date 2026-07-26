import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ymd } from "@/lib/dates";

export type HebcalCache = {
  date: string; // ymd this cache was built for
  hebrewDateToday: string | null;
  candleLighting: string | null; // ISO
  havdalah: string | null; // ISO
  parasha: string | null;
  isErevShabbatOrYomTov: boolean;
  yomTovToday: string | null;
  upcomingYomTov: { title: string; date: string }[];
};

const CACHE_KEY = "hebcal_cache" as const;

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchHebrewDate(date: Date): Promise<string | null> {
  const data = await fetchJson(`https://www.hebcal.com/converter?cfg=json&date=${ymd(date)}&g2h=1`);
  return (data?.hebrew as string) ?? null;
}

async function fetchShabbat(zip: string): Promise<{ candleLighting: string | null; havdalah: string | null; parasha: string | null }> {
  const data = await fetchJson(`https://www.hebcal.com/shabbat?cfg=json&zip=${zip}&m=50`);
  const items = (data?.items as { title: string; date: string; category: string }[]) ?? [];
  const candles = items.find((i) => i.category === "candles");
  const havdalah = items.find((i) => i.category === "havdalah");
  const parasha = items.find((i) => i.category === "parashat");
  return {
    candleLighting: candles?.date ?? null,
    havdalah: havdalah?.date ?? null,
    parasha: parasha?.title ?? null,
  };
}

async function fetchUpcomingYomTov(zip: string): Promise<{ title: string; date: string }[]> {
  const now = new Date();
  const data = await fetchJson(
    `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=off&mod=off&nx=off&year=${now.getFullYear()}&month=x&ss=off&mf=off&c=on&geo=zip&zip=${zip}`
  );
  const items = (data?.items as { title: string; date: string; yomtov?: boolean; category: string }[]) ?? [];
  const nowStr = ymd(now);
  return items
    .filter((i) => i.category === "holiday" && i.yomtov && i.date >= nowStr)
    .slice(0, 10)
    .map((i) => ({ title: i.title, date: i.date }));
}

export async function getHebcalInfo(zip: string): Promise<HebcalCache> {
  const today = ymd(new Date());
  const cached = await db.query.settings.findFirst({ where: eq(settings.key, CACHE_KEY) });
  const cachedValue = cached?.value as HebcalCache | undefined;
  if (cachedValue?.date === today) return cachedValue;

  const now = new Date();
  const [hebrewDateToday, shabbat, upcomingYomTov] = await Promise.all([
    fetchHebrewDate(now),
    fetchShabbat(zip),
    fetchUpcomingYomTov(zip),
  ]);

  const dayOfWeek = now.getDay();
  const yomTovToday = upcomingYomTov.find((y) => y.date === today)?.title ?? null;
  const isErevShabbatOrYomTov =
    dayOfWeek === 5 || upcomingYomTov.some((y) => y.date === ymd(new Date(now.getTime() + 86400000)));

  const info: HebcalCache = {
    date: today,
    hebrewDateToday,
    candleLighting: shabbat.candleLighting,
    havdalah: shabbat.havdalah,
    parasha: shabbat.parasha,
    isErevShabbatOrYomTov,
    yomTovToday,
    upcomingYomTov,
  };

  await db
    .insert(settings)
    .values({ key: CACHE_KEY, value: info })
    .onConflictDoUpdate({ target: settings.key, set: { value: info } });

  return info;
}
