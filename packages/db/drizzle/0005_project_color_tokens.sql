ALTER TABLE "project" ALTER COLUMN "color" SET DEFAULT 'project-1';--> statement-breakpoint
-- The former presets of the app and the former color names of the CLI
-- become the closest design tokens; custom hex colors stay as they are.
UPDATE "project" SET "color" = CASE lower("color")
  WHEN '#6366f1' THEN 'project-1'
  WHEN '#14b8a6' THEN 'project-3'
  WHEN '#3b82f6' THEN 'project-13'
  WHEN '#ef4444' THEN 'project-10'
  WHEN '#8b5cf6' THEN 'project-8'
  WHEN '#ec4899' THEN 'project-14'
  WHEN '#22c55e' THEN 'project-11'
  WHEN '#eab308' THEN 'project-2'
  WHEN '#f97316' THEN 'project-16'
  WHEN '#64748b' THEN 'project-17'
  WHEN '#e74c3c' THEN 'project-10'
  WHEN '#2ecc71' THEN 'project-11'
  WHEN '#3498db' THEN 'project-13'
  WHEN '#f1c40f' THEN 'project-2'
  WHEN '#e67e22' THEN 'project-16'
  WHEN '#9b59b6' THEN 'project-8'
  WHEN '#e91e63' THEN 'project-14'
  WHEN '#1abc9c' THEN 'project-9'
  WHEN '#95a5a6' THEN 'project-17'
  WHEN '#ecf0f1' THEN 'project-18'
  WHEN '#2c3e50' THEN 'project-15'
END
WHERE lower("color") IN (
  '#6366f1', '#14b8a6', '#3b82f6', '#ef4444', '#8b5cf6',
  '#ec4899', '#22c55e', '#eab308', '#f97316', '#64748b',
  '#e74c3c', '#2ecc71', '#3498db', '#f1c40f', '#e67e22', '#9b59b6',
  '#e91e63', '#1abc9c', '#95a5a6', '#ecf0f1', '#2c3e50'
);--> statement-breakpoint
-- Anything else that is no token and no #rrggbb, such as a color name.
UPDATE "project" SET "color" = 'project-1'
WHERE "color" !~ '^(project-([1-9]|1[0-8]|none)|#[0-9a-fA-F]{6})$';--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_color_check" CHECK ("project"."color" ~ '^(project-([1-9]|1[0-8]|none)|#[0-9a-fA-F]{6})$');
