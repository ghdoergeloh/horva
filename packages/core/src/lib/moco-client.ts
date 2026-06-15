import type { MocoConfig } from "../config/config.js";

/**
 * Thin wrapper around the Moco REST API (https://www.mocoapp.com).
 *
 * Auth uses the user's personal API key via the documented header
 * `Authorization: Token token=<key>`. The base URL is account-specific:
 * `https://{subdomain}.mocoapp.com/api/v1`.
 *
 * This is the first (and currently only) outbound HTTP integration in the
 * codebase. `fetch` is provided as a Node global (Node >= 18).
 */

export interface MocoTask {
  id: number;
  name: string;
  active: boolean;
  billable: boolean;
}

export interface MocoProject {
  id: number;
  name: string;
  tasks: MocoTask[];
}

export interface CreateActivityInput {
  date: string; // YYYY-MM-DD
  projectId: number;
  taskId: number;
  seconds: number;
  description?: string;
}

function baseUrl(cfg: MocoConfig): string {
  return `https://${cfg.subdomain}.mocoapp.com/api/v1`;
}

async function mocoFetch(
  cfg: MocoConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl(cfg)}${path}`, {
      method,
      headers: {
        Authorization: `Token token=${cfg.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new Error(
      `Moco request failed (${method} ${path}): ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Moco API error ${String(res.status)} ${res.statusText} (${method} ${path})${
        text ? `: ${text}` : ""
      }`,
    );
  }

  if (res.status === 204) return undefined;
  return res.json();
}

/**
 * List the projects assigned to the API-key owner, each with its embedded
 * activities ("Leistungen"). Reduced to the fields the sync feature needs.
 */
export async function listAssignedProjects(
  cfg: MocoConfig,
): Promise<MocoProject[]> {
  const raw = (await mocoFetch(cfg, "GET", "/projects/assigned")) as {
    id: number;
    name: string;
    tasks?: {
      id: number;
      name: string;
      active?: boolean;
      billable?: boolean;
    }[];
  }[];

  return raw.map((p) => ({
    id: p.id,
    name: p.name,
    tasks: (p.tasks ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      active: t.active ?? true,
      billable: t.billable ?? true,
    })),
  }));
}

/** Create a single activity (time entry) in Moco. */
export async function createActivity(
  cfg: MocoConfig,
  input: CreateActivityInput,
): Promise<{ id: number }> {
  const created = (await mocoFetch(cfg, "POST", "/activities", {
    date: input.date,
    project_id: input.projectId,
    task_id: input.taskId,
    seconds: input.seconds,
    ...(input.description ? { description: input.description } : {}),
  })) as { id: number };
  return { id: created.id };
}
