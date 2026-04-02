ALTER TABLE "task" RENAME COLUMN "scheduled_date" TO "scheduled_at";--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "recurrence_rule" text;--> statement-breakpoint
UPDATE "task" SET "scheduled_at" = "scheduled_at" + interval '10 hours'
  WHERE "scheduled_at" IS NOT NULL
  AND EXTRACT(hour FROM "scheduled_at") = 0
  AND EXTRACT(minute FROM "scheduled_at") = 0;
