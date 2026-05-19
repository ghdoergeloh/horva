// Thin wrapper around the preload-exposed setup bridge. Only used during
// first-launch bootstrap; once setup is complete the renderer talks to the
// main process exclusively via oRPC.

export interface SetupStatus {
  ready: boolean;
  error: string | null;
  defaults: { databaseUrl: string };
}

export interface CompleteSetupInput {
  name: string;
  databaseUrl: string;
}

interface SetupBridge {
  status(): Promise<SetupStatus>;
  complete(input: CompleteSetupInput): Promise<void>;
  retry(): Promise<void>;
}

declare global {
  interface Window {
    setup: SetupBridge;
  }
}

export const setupBridge: SetupBridge = window.setup;
