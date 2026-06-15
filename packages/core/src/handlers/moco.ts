import type { HandlerArgs } from "./types";
import { setMocoConfig } from "../config/config.js";
import {
  buildSyncPreview,
  fetchRemoteProjects,
  getMocoConfigStatus,
  getTaskMapping,
  runSync,
  setProjectLink,
  setTaskMapping,
} from "../services/moco.service.js";

export function configGet(_args: HandlerArgs) {
  return getMocoConfigStatus();
}

interface ConfigSetInput {
  apiKey: string;
  subdomain: string;
}

export function configSet({ input }: HandlerArgs<ConfigSetInput>) {
  setMocoConfig({ apiKey: input.apiKey, subdomain: input.subdomain });
  return { ok: true };
}

export async function remoteProjects(_args: HandlerArgs) {
  const projects = await fetchRemoteProjects();
  return { projects };
}

interface LinkSetInput {
  projectId: number;
  mocoProjectId: number | null;
  mocoDefaultTaskId: number | null;
}

export async function linkSet({ input, context }: HandlerArgs<LinkSetInput>) {
  await setProjectLink(context.db, input);
  return { ok: true };
}

interface TaskMappingGetInput {
  taskId: number;
}

export async function taskMappingGet({
  input,
  context,
}: HandlerArgs<TaskMappingGetInput>) {
  return getTaskMapping(context.db, input.taskId);
}

interface TaskMappingSetInput {
  taskId: number;
  mocoTaskId: number | null;
}

export async function taskMappingSet({
  input,
  context,
}: HandlerArgs<TaskMappingSetInput>) {
  await setTaskMapping(context.db, input);
  return { ok: true };
}

interface RangeInput {
  from: Date;
  to: Date;
}

export async function preview({ input, context }: HandlerArgs<RangeInput>) {
  const lines = await buildSyncPreview(context.db, input);
  return { lines };
}

export async function sync({ input, context }: HandlerArgs<RangeInput>) {
  const result = await runSync(context.db, input);
  return result;
}
