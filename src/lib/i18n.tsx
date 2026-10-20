"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

export type Locale = "en" | "pt";

const STORAGE_KEY = "hi-locale";

export const WEEKDAY_LABELS: Record<Locale, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
};

export const MONTH_LABELS: Record<Locale, string[]> = {
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  pt: [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ],
};

const dict = {
  en: {
    navToday: "Today",
    navRides: "Rides",
    navCalendar: "Calendar",
    navShop: "Shop",
    navJobs: "Jobs",
    navEat: "Eat",
    next: "Next",
    add: "Add",
    allDay: "All day",
    nothingToday: "Nothing on the run-of-show yet today.",
    tonight: "Tonight:",
    yomTov: "Yom Tov",
    candleLighting: "Candle lighting",
    dropOff: "Drop-off",
    pickup: "Pickup",
    schoolPickup: "School pickup",
    unassigned: "Unassigned",
    carpool: "Carpool",
    family: "Family",
    external: "External",
    assignDriver: "Assign driver",
    ridesHeading: "RIDES",
    defaults: "Defaults",
    generateWeek: "Generate week",
    generating: "Generating…",
    noRideLegs: "No ride legs",
    addRide: "Ride",
    rideNeedDriverSingular: "ride needs a driver",
    rideNeedDriverPlural: "rides need a driver",
    deleteRideConfirm: "Delete this ride?",
    print: "Print",
    printTitle: "Family Schedule",
    printForDate: "For",
    dayView: "Day",
    weekView: "Week",
    driverLabel: "Driver",
    noItemsThisDay: "Nothing scheduled.",
    today: "Today",
    thisWeek: "This week",
    loading: "Loading…",
    dismiss: "Dismiss",
    createdRidesSingular: "Created {n} ride from defaults.",
    createdRidesPlural: "Created {n} rides from defaults.",
  },
  pt: {
    navToday: "Hoje",
    navRides: "Caronas",
    navCalendar: "Calendário",
    navShop: "Compras",
    navJobs: "Tarefas",
    navEat: "Comer",
    next: "Próximo",
    add: "Adicionar",
    allDay: "Dia todo",
    nothingToday: "Nada na agenda de hoje ainda.",
    tonight: "Hoje à noite:",
    yomTov: "Yom Tov",
    candleLighting: "Acender velas",
    dropOff: "Levar",
    pickup: "Buscar",
    schoolPickup: "Buscar na escola",
    unassigned: "Sem motorista",
    carpool: "Carona compartilhada",
    family: "Família",
    external: "Externo",
    assignDriver: "Escolher motorista",
    ridesHeading: "CARONAS",
    defaults: "Padrões",
    generateWeek: "Gerar semana",
    generating: "Gerando…",
    noRideLegs: "Nenhuma carona",
    addRide: "Carona",
    rideNeedDriverSingular: "carona precisa de motorista",
    rideNeedDriverPlural: "caronas precisam de motorista",
    deleteRideConfirm: "Excluir esta carona?",
    print: "Imprimir",
    printTitle: "Agenda da Família",
    printForDate: "Para",
    dayView: "Dia",
    weekView: "Semana",
    driverLabel: "Motorista",
    noItemsThisDay: "Nada agendado.",
    today: "Hoje",
    thisWeek: "Esta semana",
    loading: "Carregando…",
    dismiss: "Dispensar",
    createdRidesSingular: "Criada {n} carona a partir dos padrões.",
    createdRidesPlural: "Criadas {n} caronas a partir dos padrões.",
  },
} satisfies Record<Locale, Record<string, string>>;

export type TranslationKey = keyof typeof dict.en;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
  weekdayLabels: string[];
  monthLabels: string[];
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

// A tiny external store over localStorage, read via useSyncExternalStore --
// the React-documented way to reconcile a client-only data source (no
// localStorage during SSR) with hydration: the server snapshot ("en")
// matches the client's first render exactly, then React re-syncs to the
// real stored value right after, as an ordinary update rather than a
// hydration mismatch or a setState-in-effect.
const storeListeners = new Set<() => void>();

function subscribe(callback: () => void) {
  storeListeners.add(callback);
  return () => storeListeners.delete(callback);
}

function getSnapshot(): Locale {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "pt" ? "pt" : "en";
  } catch {
    return "en";
  }
}

function getServerSnapshot(): Locale {
  return "en";
}

function writeLocale(l: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, l);
  } catch {
    // Private browsing / storage blocked -- the choice just won't persist.
  }
  storeListeners.forEach((cb) => cb());
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
  }, [locale]);

  function setLocale(l: Locale) {
    writeLocale(l);
  }

  function t(key: TranslationKey): string {
    return dict[locale][key] ?? dict.en[key];
  }

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t, weekdayLabels: WEEKDAY_LABELS[locale], monthLabels: MONTH_LABELS[locale] }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Outside the provider (shouldn't normally happen), fall back to English
    // rather than crashing the page.
    return {
      locale: "en",
      setLocale: () => {},
      t: (key) => dict.en[key],
      weekdayLabels: WEEKDAY_LABELS.en,
      monthLabels: MONTH_LABELS.en,
    };
  }
  return ctx;
}
