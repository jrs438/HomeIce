ALTER TABLE "ics_feeds" ADD COLUMN "needs_dropoff" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ics_feeds" ADD COLUMN "needs_pickup" boolean DEFAULT false NOT NULL;