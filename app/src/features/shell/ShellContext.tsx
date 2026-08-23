import { createContext, useContext, useMemo, type ReactNode } from "react";

import { LocaleProvider } from "../../i18n/context";
import { DEFAULT_LOCALE, isLocale } from "../../i18n/locale";
import type { useShellState } from "./useShellState";

export type Shell = ReturnType<typeof useShellState>;

const ShellContext = createContext<Shell | null>(null);

/**
 * The shell owns the locale, so providing it also provides the language every
 * component below reads through `useTranslation`. One provider, so `App.tsx`
 * keeps a single wrapper and no component has to be handed a translator.
 */
export function ShellProvider({ value, children }: { value: Shell; children: ReactNode }) {
  // A partially-built shell (a component test mounting one panel) carries no
  // locale. That degrades to the default language rather than throwing: a
  // missing preference is not a reason to render nothing.
  const locale = useMemo(
    () => ({
      locale: isLocale(value.locale) ? value.locale : DEFAULT_LOCALE,
      setLocale: value.setLocale ?? (() => undefined),
    }),
    [value.locale, value.setLocale],
  );
  return (
    <LocaleProvider value={locale}>
      <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
    </LocaleProvider>
  );
}

// The provider composes two contexts, so it lives here with the hook that
// reads it rather than in a file of its own. Fast refresh loses this file's
// state on edit; nothing in it holds any.
// oxlint-disable-next-line react/only-export-components
export function useShell(): Shell {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell must be used inside ShellProvider");
  return value;
}
