export const ACTION_TYPES = [
  "add_event",
  "add_recurring_event",
  "cancel_event",
  "modify_event",
  "assign_ride",
  "add_ride_rule",
  "add_grocery",
  "add_chore",
  "request_dinner",
  "set_menu",
  "unknown",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export type CaptureAction = {
  type: ActionType;
  // add_event / modify_event / cancel_event
  title?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  location?: string;
  notes?: string;
  approxDate?: string;
  // assign_ride / add_ride_rule / add_recurring_event
  date?: string;
  dayOfWeek?: number;
  kind?: "activity_dropoff" | "activity_pickup" | "school_pickup";
  from?: string;
  to?: string;
  time?: string;
  // add_recurring_event
  startTime?: string;
  endTime?: string;
  intervalWeeks?: number;
  driverType?: "member" | "external" | "carpool" | "unassigned";
  driverName?: string;
  label?: string;
  // shared
  kidNames?: string[];
  // add_grocery
  items?: { store: string; item: string }[];
  // add_chore
  kidName?: string;
  cadence?: string;
  // request_dinner
  text?: string;
  // set_menu
  meal?: string;
  // unknown
  note?: string;
};

export type CaptureResult = {
  actions: CaptureAction[];
  clarification_needed?: string;
};

export const CAPTURE_TOOL = {
  name: "capture_actions",
  description:
    "Record the structured actions implied by the family's natural-language input. Always call this tool exactly once with every action you can confidently extract.",
  input_schema: {
    type: "object" as const,
    properties: {
      actions: {
        type: "array",
        description: "Zero or more actions extracted from the input, in the order mentioned.",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ACTION_TYPES },
            title: { type: "string", description: "Event title (add_event/modify_event/cancel_event)" },
            start: { type: "string", description: "ISO 8601 datetime for add_event start" },
            end: { type: "string", description: "ISO 8601 datetime for add_event end (optional)" },
            allDay: { type: "boolean" },
            location: { type: "string" },
            notes: { type: "string" },
            approxDate: { type: "string", description: "ISO date used to locate an existing event for cancel_event/modify_event" },
            date: { type: "string", description: "ISO date (assign_ride, add_ride_rule exception, set_menu)" },
            dayOfWeek: { type: "integer", description: "0=Sunday..6=Saturday, for add_ride_rule/add_recurring_event" },
            kind: { type: "string", enum: ["activity_dropoff", "activity_pickup", "school_pickup"] },
            from: { type: "string", description: "Ride origin" },
            to: { type: "string", description: "Ride destination" },
            time: { type: "string", description: "HH:MM 24h time for the ride" },
            startTime: { type: "string", description: "HH:MM 24h local start time, for add_recurring_event" },
            endTime: { type: "string", description: "HH:MM 24h local end time (optional), for add_recurring_event" },
            intervalWeeks: {
              type: "integer",
              description: "For add_recurring_event: 1 for every week (default), 2 for every other week, etc. Only set >1 if the input actually says so (\"every other week\", \"biweekly\").",
            },
            driverType: { type: "string", enum: ["member", "external", "carpool", "unassigned"] },
            driverName: { type: "string", description: "Resolved family member or external driver name" },
            label: { type: "string", description: "Short label for add_ride_rule" },
            kidNames: { type: "array", items: { type: "string" }, description: "Kid(s) this action concerns" },
            items: {
              type: "array",
              description: "add_grocery items",
              items: {
                type: "object",
                properties: {
                  store: { type: "string" },
                  item: { type: "string" },
                },
                required: ["store", "item"],
              },
            },
            kidName: { type: "string", description: "Single kid for add_chore" },
            cadence: { type: "string", description: "e.g. daily, weekly" },
            text: { type: "string", description: "request_dinner free text" },
            meal: { type: "string", description: "set_menu meal description" },
            note: { type: "string", description: "Raw fallback note for unknown" },
          },
          required: ["type"],
        },
      },
      clarification_needed: {
        type: "string",
        description: "Set only when a date/entity is too ambiguous to safely act on. Ask a specific question.",
      },
    },
    required: ["actions"],
  },
};
