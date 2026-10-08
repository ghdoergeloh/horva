ALTER TABLE "project" ALTER COLUMN "color" SET DEFAULT 'project-1';--> statement-breakpoint
-- The former presets of the app become the closest design tokens; custom
-- hex colors stay as they are.
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
END
WHERE lower("color") IN (
  '#6366f1', '#14b8a6', '#3b82f6', '#ef4444', '#8b5cf6',
  '#ec4899', '#22c55e', '#eab308', '#f97316', '#64748b'
);
