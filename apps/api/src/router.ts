import { implement } from "@orpc/server";

import { auth } from "@horva/auth/auth";
import { contract } from "@horva/contract";
import { handlers } from "@horva/core";
import { db } from "@horva/db/client";

const base = implement(contract).$context<{ request: Request }>();

const authMiddleware = base.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });
  return next({ context: { session } });
});

const authed = base.use(authMiddleware);

export const router = base.router({
  user: {
    me: authed.user.me.handler(({ context }) =>
      handlers.user.me({
        input: undefined,
        context: { db, session: context.session },
      }),
    ),
    hello: authed.user.hello.handler(({ context }) =>
      handlers.user.hello({
        input: undefined,
        context: { db, session: context.session },
      }),
    ),
  },

  slot: {
    status: authed.slot.status.handler(({ context }) =>
      handlers.slot.status({
        input: undefined,
        context: { db, session: context.session },
      }),
    ),
    list: authed.slot.list.handler(({ input, context }) =>
      handlers.slot.list({ input, context: { db, session: context.session } }),
    ),
    start: authed.slot.start.handler(({ input, context }) =>
      handlers.slot.start({ input, context: { db, session: context.session } }),
    ),
    stop: authed.slot.stop.handler(({ input, context }) =>
      handlers.slot.stop({ input, context: { db, session: context.session } }),
    ),
    done: authed.slot.done.handler(({ input, context }) =>
      handlers.slot.done({ input, context: { db, session: context.session } }),
    ),
    assign: authed.slot.assign.handler(({ input, context }) =>
      handlers.slot.assign({
        input,
        context: { db, session: context.session },
      }),
    ),
    edit: authed.slot.edit.handler(({ input, context }) =>
      handlers.slot.edit({ input, context: { db, session: context.session } }),
    ),
    delete: authed.slot.delete.handler(({ input, context }) =>
      handlers.slot.delete({
        input,
        context: { db, session: context.session },
      }),
    ),
    split: authed.slot.split.handler(({ input, context }) =>
      handlers.slot.split({ input, context: { db, session: context.session } }),
    ),
    insert: authed.slot.insert.handler(({ input, context }) =>
      handlers.slot.insert({
        input,
        context: { db, session: context.session },
      }),
    ),
  },

  task: {
    list: authed.task.list.handler(({ input, context }) =>
      handlers.task.list({ input, context: { db, session: context.session } }),
    ),
    get: authed.task.get.handler(({ input, context }) =>
      handlers.task.get({ input, context: { db, session: context.session } }),
    ),
    create: authed.task.create.handler(({ input, context }) =>
      handlers.task.create({
        input,
        context: { db, session: context.session },
      }),
    ),
    update: authed.task.update.handler(({ input, context }) =>
      handlers.task.update({
        input,
        context: { db, session: context.session },
      }),
    ),
    done: authed.task.done.handler(({ input, context }) =>
      handlers.task.done({ input, context: { db, session: context.session } }),
    ),
    reopen: authed.task.reopen.handler(({ input, context }) =>
      handlers.task.reopen({
        input,
        context: { db, session: context.session },
      }),
    ),
    archive: authed.task.archive.handler(({ input, context }) =>
      handlers.task.archive({
        input,
        context: { db, session: context.session },
      }),
    ),
    delete: authed.task.delete.handler(({ input, context }) =>
      handlers.task.delete({
        input,
        context: { db, session: context.session },
      }),
    ),
    plan: authed.task.plan.handler(({ input, context }) =>
      handlers.task.plan({ input, context: { db, session: context.session } }),
    ),
    reorder: authed.task.reorder.handler(({ input, context }) =>
      handlers.task.reorder({
        input,
        context: { db, session: context.session },
      }),
    ),
  },

  project: {
    list: authed.project.list.handler(({ input, context }) =>
      handlers.project.list({
        input,
        context: { db, session: context.session },
      }),
    ),
    get: authed.project.get.handler(({ input, context }) =>
      handlers.project.get({
        input,
        context: { db, session: context.session },
      }),
    ),
    create: authed.project.create.handler(({ input, context }) =>
      handlers.project.create({
        input,
        context: { db, session: context.session },
      }),
    ),
    update: authed.project.update.handler(({ input, context }) =>
      handlers.project.update({
        input,
        context: { db, session: context.session },
      }),
    ),
    archive: authed.project.archive.handler(({ input, context }) =>
      handlers.project.archive({
        input,
        context: { db, session: context.session },
      }),
    ),
    delete: authed.project.delete.handler(({ input, context }) =>
      handlers.project.delete({
        input,
        context: { db, session: context.session },
      }),
    ),
  },

  label: {
    list: authed.label.list.handler(({ context }) =>
      handlers.label.list({
        input: undefined,
        context: { db, session: context.session },
      }),
    ),
    create: authed.label.create.handler(({ input, context }) =>
      handlers.label.create({
        input,
        context: { db, session: context.session },
      }),
    ),
    delete: authed.label.delete.handler(({ input, context }) =>
      handlers.label.delete({
        input,
        context: { db, session: context.session },
      }),
    ),
  },

  log: {
    entries: authed.log.entries.handler(({ input, context }) =>
      handlers.log.entries({
        input,
        context: { db, session: context.session },
      }),
    ),
    summary: authed.log.summary.handler(({ input, context }) =>
      handlers.log.summary({
        input,
        context: { db, session: context.session },
      }),
    ),
  },
});

export type Router = typeof router;
