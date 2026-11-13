import { oc } from "@orpc/contract";
import { z } from "zod";

/**
 * The first-launch setup between the webview and the backend sidecar. It is
 * not part of `@horva/contract`: it must work before a database and a local
 * user exist, which every procedure of the main contract needs.
 */
export const setupContract = {
  status: oc.output(
    z.object({
      ready: z.boolean(),
      error: z.string().nullable(),
      defaults: z.object({ databaseUrl: z.string() }),
    }),
  ),
  complete: oc.input(
    // Checked in the handler, so the wizard shows a readable message.
    z.object({ name: z.string(), databaseUrl: z.string() }),
  ),
  retry: oc,
};

export type SetupContract = typeof setupContract;
