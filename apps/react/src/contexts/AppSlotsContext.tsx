import type { ReactNode } from "react";
import { createContext, useContext } from "react";

/**
 * Parts that only some hosts of the app add, e.g. the database section of
 * the settings in Electron. The web app adds none.
 */
export interface AppSlots {
  /** More sections at the end of the settings page. */
  settings?: ReactNode;
}

const AppSlotsContext = createContext<AppSlots>({});

export const AppSlotsProvider = AppSlotsContext.Provider;

export function useAppSlots(): AppSlots {
  return useContext(AppSlotsContext);
}
