ALTER TABLE "project" ADD COLUMN "moco_project_id" integer;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "moco_default_task_id" integer;--> statement-breakpoint
CREATE TABLE "task_moco_mapping" (
	"task_id" integer PRIMARY KEY NOT NULL,
	"moco_task_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_moco_mapping" ADD CONSTRAINT "task_moco_mapping_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;
