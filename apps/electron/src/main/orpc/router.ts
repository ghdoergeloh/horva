import { implement } from "@orpc/server";

import { contract } from "@horva/contract";
import { handlers } from "@horva/core";

import type { LocalContext } from "./context.js";

const base = implement(contract).$context<LocalContext>();

export const router = base.router({
  user: {
    me: base.user.me.handler(({ context }) =>
      handlers.user.me({ input: undefined, context }),
    ),
    hello: base.user.hello.handler(({ context }) =>
      handlers.user.hello({ input: undefined, context }),
    ),
  },

  slot: {
    status: base.slot.status.handler(({ context }) =>
      handlers.slot.status({ input: undefined, context }),
    ),
    list: base.slot.list.handler(({ input, context }) =>
      handlers.slot.list({ input, context }),
    ),
    start: base.slot.start.handler(({ input, context }) =>
      handlers.slot.start({ input, context }),
    ),
    stop: base.slot.stop.handler(({ input, context }) =>
      handlers.slot.stop({ input, context }),
    ),
    done: base.slot.done.handler(({ input, context }) =>
      handlers.slot.done({ input, context }),
    ),
    assign: base.slot.assign.handler(({ input, context }) =>
      handlers.slot.assign({ input, context }),
    ),
    edit: base.slot.edit.handler(({ input, context }) =>
      handlers.slot.edit({ input, context }),
    ),
    delete: base.slot.delete.handler(({ input, context }) =>
      handlers.slot.delete({ input, context }),
    ),
    split: base.slot.split.handler(({ input, context }) =>
      handlers.slot.split({ input, context }),
    ),
    insert: base.slot.insert.handler(({ input, context }) =>
      handlers.slot.insert({ input, context }),
    ),
  },

  task: {
    list: base.task.list.handler(({ input, context }) =>
      handlers.task.list({ input, context }),
    ),
    get: base.task.get.handler(({ input, context }) =>
      handlers.task.get({ input, context }),
    ),
    create: base.task.create.handler(({ input, context }) =>
      handlers.task.create({ input, context }),
    ),
    update: base.task.update.handler(({ input, context }) =>
      handlers.task.update({ input, context }),
    ),
    done: base.task.done.handler(({ input, context }) =>
      handlers.task.done({ input, context }),
    ),
    reopen: base.task.reopen.handler(({ input, context }) =>
      handlers.task.reopen({ input, context }),
    ),
    archive: base.task.archive.handler(({ input, context }) =>
      handlers.task.archive({ input, context }),
    ),
    delete: base.task.delete.handler(({ input, context }) =>
      handlers.task.delete({ input, context }),
    ),
    plan: base.task.plan.handler(({ input, context }) =>
      handlers.task.plan({ input, context }),
    ),
    reorder: base.task.reorder.handler(({ input, context }) =>
      handlers.task.reorder({ input, context }),
    ),
  },

  project: {
    list: base.project.list.handler(({ input, context }) =>
      handlers.project.list({ input, context }),
    ),
    get: base.project.get.handler(({ input, context }) =>
      handlers.project.get({ input, context }),
    ),
    create: base.project.create.handler(({ input, context }) =>
      handlers.project.create({ input, context }),
    ),
    update: base.project.update.handler(({ input, context }) =>
      handlers.project.update({ input, context }),
    ),
    archive: base.project.archive.handler(({ input, context }) =>
      handlers.project.archive({ input, context }),
    ),
    delete: base.project.delete.handler(({ input, context }) =>
      handlers.project.delete({ input, context }),
    ),
  },

  label: {
    list: base.label.list.handler(({ context }) =>
      handlers.label.list({ input: undefined, context }),
    ),
    create: base.label.create.handler(({ input, context }) =>
      handlers.label.create({ input, context }),
    ),
    delete: base.label.delete.handler(({ input, context }) =>
      handlers.label.delete({ input, context }),
    ),
  },

  log: {
    entries: base.log.entries.handler(({ input, context }) =>
      handlers.log.entries({ input, context }),
    ),
    summary: base.log.summary.handler(({ input, context }) =>
      handlers.log.summary({ input, context }),
    ),
  },
});
