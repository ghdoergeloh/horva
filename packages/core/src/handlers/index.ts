import * as label from "./label";
import * as log from "./log";
import * as project from "./project";
import * as slot from "./slot";
import * as task from "./task";
import * as user from "./user";

export type { HandlerArgs, HandlerContext, Session } from "./types";

export const handlers = {
  user,
  slot,
  task,
  project,
  label,
  log,
};
