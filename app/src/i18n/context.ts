import { createContext, useContext, useMemo } from "react";

import { formatDate, formatList, formatMoney, formatNumber, formatSigned } from "../lib/format";
import { translateRich, type RichParams } from "./rich";
import { translate, type MessageParams } from "./translate";
import { DEFAULT_LOCALE, type Locale } from "./locale";
import type { ReactNode } from "react";

export interface LocaleValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

/**
 * The default is a real value, not `null`: a component rendered outside the
 * shell (the standalone planner panel, the actuals empty state, the
 * responsible-data cards, and every unit test of them) must still render, in
 * the default locale, rather than throw.
 */
const LocaleContext = createContext<LocaleValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
});

export const LocaleProvider = LocaleContext.Provider;

export interface Translator {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** A message as plain text. Inline markup is stripped. */
  t: (key: string, params?: MessageParams) => string;
  /** A message with its inline emphasis and any node-valued placeholders. */
  tx: (key: string, params?: RichParams) => ReactNode;
  number: (value: number, digits?: number) => string;
  signed: (value: number) => string;
  date: (value: string) => string;
  money: (value: number, currency?: string) => string;
  list: (items: readonly string[]) => string;
}

/**
 * The translator as a plain value, so `useShellState` — which owns the locale
 * and therefore cannot read the context it populates — builds the same one
 * every component gets.
 */
export function createTranslator(locale: Locale, setLocale: (next: Locale) => void): Translator {
  return {
    locale,
    setLocale,
    t: (key, params) => translate(locale, key, params),
    tx: (key, params) => translateRich(locale, key, params),
    number: (value, digits = 0) => formatNumber(value, digits, locale),
    signed: (value) => formatSigned(value, locale),
    date: (value) => formatDate(value, locale),
    money: (value, currency = "USD") => formatMoney(value, currency, locale),
    list: (items) => formatList(items, locale),
  };
}

export function useTranslation(): Translator {
  const { locale, setLocale } = useContext(LocaleContext);
  return useMemo(() => createTranslator(locale, setLocale), [locale, setLocale]);
}
