CREATE TYPE "public"."driver_type" AS ENUM('member', 'external', 'carpool', 'unassigned');--> statement-breakpoint
CREATE TYPE "public"."event_source" AS ENUM('manual', 'ics', 'email', 'capture');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('proposed', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ics_feed_kind" AS ENUM('events', 'busy');--> statement-breakpoint
CREATE TYPE "public"."inbox_source" AS ENUM('email', 'capture_image', 'capture_text');--> statement-breakpoint
CREATE TYPE "public"."inbox_status" AS ENUM('pending', 'approved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('parent', 'kid', 'sitter');--> statement-breakpoint
CREATE TYPE "public"."ride_kind" AS ENUM('activity_dropoff', 'activity_pickup', 'school_pickup');--> statement-breakpoint
CREATE TABLE "chores" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text,
	"title" text NOT NULL,
	"cadence" text DEFAULT 'weekly' NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"week" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dinner_menu" (
	"id" text PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"meal" text NOT NULL,
	"requested_by" text,
	"is_yom_tov" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dinner_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text,
	"text" text NOT NULL,
	"votes" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"start" timestamp NOT NULL,
	"end" timestamp,
	"all_day" boolean DEFAULT false NOT NULL,
	"location" text,
	"kid_ids" text[] DEFAULT '{}' NOT NULL,
	"source" "event_source" DEFAULT 'manual' NOT NULL,
	"source_ref" text,
	"ics_uid" text,
	"status" "event_status" DEFAULT 'confirmed' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_drivers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"phone" text,
	"email" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_items" (
	"id" text PRIMARY KEY NOT NULL,
	"store" text NOT NULL,
	"item" text NOT NULL,
	"added_by" text,
	"done" boolean DEFAULT false NOT NULL,
	"done_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ics_feeds" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"kid_ids" text[] DEFAULT '{}' NOT NULL,
	"kind" "ics_feed_kind" DEFAULT 'events' NOT NULL,
	"last_polled" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_items" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "inbox_source" NOT NULL,
	"raw" text NOT NULL,
	"parsed_actions" jsonb,
	"status" "inbox_status" DEFAULT 'pending' NOT NULL,
	"from_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" "member_role" NOT NULL,
	"color" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"emails" text[] DEFAULT '{}' NOT NULL,
	"invite_email" text,
	"push_subscription" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"kind" "ride_kind" NOT NULL,
	"kid_ids" text[] DEFAULT '{}' NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"time" time,
	"driver_type" "driver_type" DEFAULT 'unassigned' NOT NULL,
	"driver_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text,
	"date" date NOT NULL,
	"time" time NOT NULL,
	"kind" "ride_kind" NOT NULL,
	"kid_ids" text[] DEFAULT '{}' NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"driver_type" "driver_type" DEFAULT 'unassigned' NOT NULL,
	"driver_id" text,
	"confirmed" boolean DEFAULT false NOT NULL,
	"ics_uid" text,
	"ics_sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "undo_log" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text,
	"description" text NOT NULL,
	"inverse_action" jsonb NOT NULL,
	"applied" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinner_requests" ADD CONSTRAINT "dinner_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;