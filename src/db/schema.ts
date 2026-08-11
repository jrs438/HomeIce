import { nanoid } from "nanoid";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  integer,
  numeric,
  date,
  time,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => nanoid());

// ---------- enums ----------
export const memberRoleEnum = pgEnum("member_role", ["parent", "kid", "sitter"]);
export const eventSourceEnum = pgEnum("event_source", ["manual", "ics", "email", "capture", "recurring"]);
export const eventStatusEnum = pgEnum("event_status", ["proposed", "confirmed", "cancelled"]);
export const rideKindEnum = pgEnum("ride_kind", [
  "activity_dropoff",
  "activity_pickup",
  "school_pickup",
]);
export const driverTypeEnum = pgEnum("driver_type", [
  "member",
  "external",
  "carpool",
  "unassigned",
]);
export const inboxSourceEnum = pgEnum("inbox_source", ["email", "capture_image", "capture_text"]);
export const inboxStatusEnum = pgEnum("inbox_status", ["pending", "approved", "dismissed"]);
export const icsFeedKindEnum = pgEnum("ics_feed_kind", ["events", "busy"]);

// ---------- tables ----------
export const members = pgTable("members", {
  id: id(),
  name: text("name").notNull(),
  role: memberRoleEnum("role").notNull(),
  color: text("color").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  emails: text("emails").array().notNull().default([]),
  inviteEmail: text("invite_email"),
  pushSubscription: jsonb("push_subscription"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const externalDrivers = pgTable("external_drivers", {
  id: id(),
  name: text("name").notNull(),
  label: text("label").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: id(),
  title: text("title").notNull(),
  start: timestamp("start").notNull(),
  end: timestamp("end"),
  allDay: boolean("all_day").notNull().default(false),
  location: text("location"),
  kidIds: text("kid_ids").array().notNull().default([]),
  source: eventSourceEnum("source").notNull().default("manual"),
  sourceRef: text("source_ref"),
  icsUid: text("ics_uid"),
  status: eventStatusEnum("status").notNull().default("confirmed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rides = pgTable("rides", {
  id: id(),
  eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  time: time("time").notNull(),
  kind: rideKindEnum("kind").notNull(),
  kidIds: text("kid_ids").array().notNull().default([]),
  from: text("from").notNull(),
  to: text("to").notNull(),
  driverType: driverTypeEnum("driver_type").notNull().default("unassigned"),
  driverId: text("driver_id"),
  confirmed: boolean("confirmed").notNull().default(false),
  icsUid: text("ics_uid"),
  icsSequence: integer("ics_sequence").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rideRules = pgTable("ride_rules", {
  id: id(),
  label: text("label").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun..6=Sat
  intervalWeeks: integer("interval_weeks").notNull().default(1),
  anchorDate: date("anchor_date"), // reference week for intervalWeeks > 1; ignored when interval is 1
  kind: rideKindEnum("kind").notNull(),
  kidIds: text("kid_ids").array().notNull().default([]),
  from: text("from").notNull(),
  to: text("to").notNull(),
  time: time("time"),
  driverType: driverTypeEnum("driver_type").notNull().default("unassigned"),
  driverId: text("driver_id"),
  active: boolean("active").notNull().default(true),
  // Set when this rule was auto-created from a recurring event's "needs a ride"
  // config, so a skipped event occurrence (event_exceptions) also skips this ride.
  eventRuleId: text("event_rule_id").references(
    (): AnyPgColumn => eventRules.id,
    { onDelete: "cascade" }
  ),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const eventRules = pgTable("event_rules", {
  id: id(),
  title: text("title").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun..6=Sat
  intervalWeeks: integer("interval_weeks").notNull().default(1),
  anchorDate: date("anchor_date").notNull(), // date of the first occurrence
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  location: text("location"),
  kidIds: text("kid_ids").array().notNull().default([]),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// A recorded "skip this date" for a recurring event series (and, by extension,
// any ride_rule linked to it via eventRuleId). Presence of a row = skipped;
// there's nothing to record for a plain edit of an already-materialized instance.
export const eventExceptions = pgTable("event_exceptions", {
  id: id(),
  eventRuleId: text("event_rule_id")
    .notNull()
    .references(() => eventRules.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groceryItems = pgTable("grocery_items", {
  id: id(),
  store: text("store").notNull(),
  item: text("item").notNull(),
  addedBy: text("added_by"),
  done: boolean("done").notNull().default(false),
  doneAt: timestamp("done_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chores = pgTable("chores", {
  id: id(),
  memberId: text("member_id").references(() => members.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  cadence: text("cadence").notNull().default("weekly"),
  done: boolean("done").notNull().default(false),
  week: text("week").notNull(),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dinnerMenu = pgTable("dinner_menu", {
  id: id(),
  date: date("date").notNull(),
  meal: text("meal").notNull(),
  requestedBy: text("requested_by"),
  isYomTov: boolean("is_yom_tov").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dinnerRequests = pgTable("dinner_requests", {
  id: id(),
  memberId: text("member_id").references(() => members.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  votes: text("votes").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const icsFeeds = pgTable("ics_feeds", {
  id: id(),
  url: text("url").notNull(),
  label: text("label").notNull(),
  kidIds: text("kid_ids").array().notNull().default([]),
  kind: icsFeedKindEnum("kind").notNull().default("events"),
  // Whether newly-imported events from this feed should automatically get an
  // unassigned drop-off/pick-up ride created alongside them (someone still
  // has to claim it on the Rides tab). Ignored for "busy" feeds, which are
  // block-out overlays, not real family events.
  needsDropoff: boolean("needs_dropoff").notNull().default(false),
  needsPickup: boolean("needs_pickup").notNull().default(false),
  lastPolled: timestamp("last_polled"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inboxItems = pgTable("inbox_items", {
  id: id(),
  source: inboxSourceEnum("source").notNull(),
  raw: text("raw").notNull(),
  parsedActions: jsonb("parsed_actions"),
  status: inboxStatusEnum("status").notNull().default("pending"),
  fromLabel: text("from_label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const undoLog = pgTable("undo_log", {
  id: id(),
  memberId: text("member_id"),
  description: text("description").notNull(),
  inverseAction: jsonb("inverse_action").notNull(),
  applied: boolean("applied").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sitterShifts = pgTable("sitter_shifts", {
  id: id(),
  sitterId: text("sitter_id").references(() => members.id, { onDelete: "set null" }),
  date: date("date").notNull(),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 7, scale: 2 }),
  notes: text("notes"),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reimbursements = pgTable("reimbursements", {
  id: id(),
  memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
  date: date("date").notNull(),
  amount: numeric("amount", { precision: 8, scale: 2 }).notNull(),
  store: text("store"),
  notes: text("notes"),
  reimbursed: boolean("reimbursed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
