export type EventRecord = {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  location: string | null;
  kidIds: string[];
  source: "manual" | "ics" | "email" | "capture";
  sourceRef: string | null;
  icsUid: string | null;
  status: "proposed" | "confirmed" | "cancelled";
  notes: string | null;
};

export type MemberLite = {
  id: string;
  name: string;
  color: string;
  role: "parent" | "kid" | "sitter";
};
