import { afterEach, describe, expect, it, vi } from "vitest";

import type { MocoConfig } from "../config/config.js";
import { createActivity, listAssignedProjects } from "./moco-client.js";

const cfg: MocoConfig = { apiKey: "secret-key", subdomain: "acme" };

function mockFetch(impl: (url: string, init: RequestInit) => Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init: RequestInit) => Promise.resolve(impl(url, init))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("moco-client", () => {
  it("sends the personal-key auth header and account base URL", async () => {
    let seenUrl = "";
    let seenAuth: string | null = null;
    mockFetch((url, init) => {
      seenUrl = url;
      seenAuth = new Headers(init.headers).get("Authorization");
      return new Response(JSON.stringify([]), { status: 200 });
    });

    await listAssignedProjects(cfg);

    expect(seenUrl).toBe("https://acme.mocoapp.com/api/v1/projects/assigned");
    expect(seenAuth).toBe("Token token=secret-key");
  });

  it("reduces assigned projects to id/name/tasks", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify([
            {
              id: 100,
              name: "Alpha",
              tasks: [{ id: 9, name: "Dev", active: true, billable: false }],
            },
          ]),
          { status: 200 },
        ),
    );

    const projects = await listAssignedProjects(cfg);

    expect(projects).toEqual([
      {
        id: 100,
        name: "Alpha",
        tasks: [{ id: 9, name: "Dev", active: true, billable: false }],
      },
    ]);
  });

  it("posts an activity with seconds (not hours) and YYYY-MM-DD date", async () => {
    let body: unknown;
    mockFetch((_url, init) => {
      body = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ id: 7 }), { status: 200 });
    });

    const res = await createActivity(cfg, {
      date: "2026-06-10",
      projectId: 100,
      taskId: 900,
      seconds: 5400,
      description: "Build",
    });

    expect(res).toEqual({ id: 7 });
    expect(body).toEqual({
      date: "2026-06-10",
      project_id: 100,
      task_id: 900,
      seconds: 5400,
      description: "Build",
    });
  });

  it("throws a descriptive error on a non-2xx response", async () => {
    mockFetch(
      () => new Response("nope", { status: 422, statusText: "Unprocessable" }),
    );

    await expect(
      createActivity(cfg, {
        date: "2026-06-10",
        projectId: 1,
        taskId: 2,
        seconds: 60,
      }),
    ).rejects.toThrow(/422/);
  });
});
