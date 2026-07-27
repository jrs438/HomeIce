ALTER TYPE "public"."event_source" ADD VALUE 'recurring';--> statement-breakpoint
CREATE TABLE "event_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"event_rule_id" text NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"interval_weeks" integer DEFAULT 1 NOT NULL,
	"anchor_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time,
	"location" text,
	"kid_ids" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ride_rules" ADD COLUMN "interval_weeks" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "ride_rules" ADD COLUMN "anchor_date" date;--> statement-breakpoint
ALTER TABLE "ride_rules" ADD COLUMN "event_rule_id" text;--> statement-breakpoint
ALTER TABLE "event_exceptions" ADD CONSTRAINT "event_exceptions_event_rule_id_event_rules_id_fk" FOREIGN KEY ("event_rule_id") REFERENCES "public"."event_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_rules" ADD CONSTRAINT "ride_rules_event_rule_id_event_rules_id_fk" FOREIGN KEY ("event_rule_id") REFERENCES "public"."event_rules"("id") ON DELETE cascade ON UPDATE no action;