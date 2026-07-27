export type RideRecord = {
  id: string;
  eventId: string | null;
  date: string;
  time: string;
  kind: "activity_dropoff" | "activity_pickup" | "school_pickup";
  kidIds: string[];
  from: string;
  to: string;
  driverType: "member" | "external" | "carpool" | "unassigned";
  driverId: string | null;
  confirmed: boolean;
  icsUid?: string | null;
  icsSequence?: number;
};

export type RideRuleRecord = {
  id: string;
  label: string;
  dayOfWeek: number;
  intervalWeeks: number;
  anchorDate: string | null;
  kind: RideRecord["kind"];
  kidIds: string[];
  from: string;
  to: string;
  time: string | null;
  driverType: RideRecord["driverType"];
  driverId: string | null;
  active: boolean;
  eventRuleId: string | null;
};

export type EventRuleRecord = {
  id: string;
  title: string;
  dayOfWeek: number;
  intervalWeeks: number;
  anchorDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  kidIds: string[];
  notes: string | null;
  active: boolean;
};

export type ExternalDriverRecord = {
  id: string;
  name: string;
  label: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

export const RIDE_KIND_LABELS: Record<RideRecord["kind"], string> = {
  activity_dropoff: "Drop-off",
  activity_pickup: "Pickup",
  school_pickup: "School pickup",
};
