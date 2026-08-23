/**
 * The message lookup, and the two rules that keep translation honest.
 *
 * 1. **Whole messages, named placeholders.** A message is one complete
 *    sentence (or one complete label) with `{name}` holes in it. Nothing in
 *    this app builds a sentence by concatenating fragments, because English
 *    word order is not Spanish word order and a fragment has no gender,
 *    number, or article to agree with.
 * 2. **Plurals are selected, never suffixed.** `t(key, { count })` resolves
 *    `key.one` / `key.other` through `Intl.PluralRules` for the *active*
 *    locale. Nothing appends an "s".
 *
 * Inline emphasis travels inside the message rather than around it, so a
 * translator controls where the bold starts: `<b>`, `<i>`, `<c>` (code), and
 * `<br>` are understood by `renderRich`. Plain `t` strips them, which is what
 * an `aria-label` or a clipboard export wants.
 */

import { EN_MESSAGES } from "./en";
import { ES_MESSAGES } from "./es";
import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from "./locale";

export type MessageKey = keyof typeof EN_MESSAGES;

export type Catalogue = Record<MessageKey, string>;

export const CATALOGUES: Record<Locale, Catalogue> = {
  en: EN_MESSAGES,
  es: ES_MESSAGES,
};

export type MessageValue = string | number;

export interface MessageParams {
  [name: string]: MessageValue;
}

const pluralRules = new Map<Locale, Intl.PluralRules>();

function pluralCategory(locale: Locale, count: number): string {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(INTL_LOCALE[locale]);
    pluralRules.set(locale, rules);
  }
  return rules.select(count);
}

/**
 * The raw catalogue string for a key, after plural selection and locale
 * fallback. Placeholders are still in it.
 */
export function lookup(locale: Locale, key: string, params?: MessageParams): string {
  const catalogue = CATALOGUES[locale] as Record<string, string | undefined>;
  const fallback = CATALOGUES[DEFAULT_LOCALE] as Record<string, string | undefined>;
  const count = params?.count;
  const candidates: string[] = [];
  if (typeof count === "number") {
    candidates.push(`${key}.${pluralCategory(locale, count)}`, `${key}.other`);
  }
  candidates.push(key);
  for (const candidate of candidates) {
    const value = catalogue[candidate] ?? fallback[candidate];
    if (value !== undefined) return value;
  }
  return key;
}

const PLACEHOLDER = /\{(\w+)\}/g;

export function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replaceAll(PLACEHOLDER, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

const MARKUP = /<\/?(?:b|i|c)>|<br\s*\/?>/g;

/** A message as plain text: markup removed, placeholders filled. */
export function translate(locale: Locale, key: string, params?: MessageParams): string {
  return interpolate(lookup(locale, key, params), params).replaceAll(MARKUP, "");
}
