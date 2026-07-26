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
};

export type RideRuleRecord = {
  id: string;
  label: string;
  dayOfWeek: number;
  kind: RideRecord["kind"];
  kidIds: string[];
  from: string;
  to: string;
  time: string | null;
  driverType: RideRecord["driverType"];
  driverId: string | null;
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
