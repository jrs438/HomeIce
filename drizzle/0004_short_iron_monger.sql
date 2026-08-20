ALTER TABLE "ics_feeds" ADD COLUMN "skip_keywords" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "ics_feeds" ADD COLUMN "only_keywords" text[] DEFAULT '{}' NOT NULL;