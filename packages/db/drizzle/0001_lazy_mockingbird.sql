CREATE TYPE "public"."task_type" AS ENUM('task', 'activity');--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "task_type" "task_type" DEFAULT 'task' NOT NULL;