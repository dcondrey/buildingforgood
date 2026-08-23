import { createContext, useContext } from "react";

import type { useShellState } from "./useShellState";

export type Shell = ReturnType<typeof useShellState>;

const ShellContext = createContext<Shell | null>(null);

export const ShellProvider = ShellContext.Provider;

export function useShell(): Shell {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell must be used inside ShellProvider");
  return value;
}
