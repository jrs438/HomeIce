CREATE TABLE "reimbursements" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text,
	"date" date NOT NULL,
	"amount" numeric(8, 2) NOT NULL,
	"store" text,
	"notes" text,
	"reimbursed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sitter_shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"sitter_id" text,
	"date" date NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"rate" numeric(7, 2),
	"notes" text,
	"paid" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitter_shifts" ADD CONSTRAINT "sitter_shifts_sitter_id_members_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;