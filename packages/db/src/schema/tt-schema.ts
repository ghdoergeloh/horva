import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Sequences for integer PKs
export const projectIdSeq = pgSequence("project_id_seq", { startWith: 1 });
export const taskIdSeq = pgSequence("task_id_seq", { startWith: 1 });
export const labelIdSeq = pgSequence("label_id_seq", { startWith: 1 });
export const slotIdSeq = pgSequence("slot_id_seq", { startWith: 1 });

// Enums
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "archived",
  "deleted",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "done",
  "archived",
  "deleted",
]);

export const slotStateEnum = pgEnum("slot_state", [
  "active",
  "no_task",
  "task_deleted",
]);

// Tables
export const project = pgTable("project", {
  id: integer("id")
    .primaryKey()
    .default(sql`nextval('project_id_seq')`),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  status: projectStatusEnum("status").notNull().default("active"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const task = pgTable("task", {
  id: integer("id")
    .primaryKey()
    .default(sql`nextval('task_id_seq')`),
  name: text("name").notNull(),
  projectId: integer("project_id")
    .notNull()
    .references(() => project.id),
  status: taskStatusEnum("status").notNull().default("open"),
  scheduledDate: timestamp("scheduled_date"),
  notes: text("notes"),
  links: text("links")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  doneAt: timestamp("done_at"),
  archivedAt: timestamp("archived_at"),
  deletedAt: timestamp("deleted_at"),
});

export const label = pgTable("label", {
  id: integer("id")
    .primaryKey()
    .default(sql`nextval('label_id_seq')`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskLabel = pgTable(
  "task_label",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
      .notNull()
      .references(() => label.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.labelId] })],
);

export const slot = pgTable("slot", {
  id: integer("id")
    .primaryKey()
    .default(sql`nextval('slot_id_seq')`),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  taskId: integer("task_id").references(() => task.id, {
    onDelete: "set null",
  }),
  state: slotStateEnum("state").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const projectRelations = relations(project, ({ many }) => ({
  tasks: many(task),
}));

export const taskRelations = relations(task, ({ one, many }) => ({
  project: one(project, {
    fields: [task.projectId],
    references: [project.id],
  }),
  taskLabels: many(taskLabel),
  slots: many(slot),
}));

export const labelRelations = relations(label, ({ many }) => ({
  taskLabels: many(taskLabel),
}));

export const taskLabelRelations = relations(taskLabel, ({ one }) => ({
  task: one(task, {
    fields: [taskLabel.taskId],
    references: [task.id],
  }),
  label: one(label, {
    fields: [taskLabel.labelId],
    references: [label.id],
  }),
}));

export const slotRelations = relations(slot, ({ one }) => ({
  task: one(task, {
    fields: [slot.taskId],
    references: [task.id],
  }),
}));
