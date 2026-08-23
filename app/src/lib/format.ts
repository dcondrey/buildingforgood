import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from "../i18n/locale";

/**
 * Display formatting, with the locale threaded through it.
 *
 * The locale argument defaults to `en`, so every existing caller keeps the
 * exact output it had. `es` maps to `es-US` (see `i18n/locale.ts`), which
 * writes the same digits, the same grouping separator, and the same decimal
 * point as `en-US`: switching language translates words, never numerals, and
 * never re-rounds a figure a reader is checking against the artifact.
 */

function tag(locale: Locale): string {
  return INTL_LOCALE[locale] ?? INTL_LOCALE[DEFAULT_LOCALE];
}

export function formatNumber(value: number, digits = 0, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(tag(locale), { maximumFractionDigits: digits }).format(value);
}

export function formatDate(value: string, locale: Locale = DEFAULT_LOCALE): string {
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(tag(locale), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  }
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat(tag(locale), { dateStyle: "medium" }).format(date);
}

/**
 * The localized display formatter for money.
 *
 * It reproduces `domain/cost`'s `formatCurrency` exactly at `en` — pinned by
 * a test in `i18n/i18n.test.tsx` — and exists only because the domain
 * formatter is fixed at `en-US` and is not this workstream's to change. It is
 * a display wrapper, never an allocation input, and no plan is computed from
 * anything it returns.
 */
export function formatMoney(
  value: number,
  currency = "USD",
  locale: Locale = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(tag(locale), {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number.isFinite(value) ? value : 0);
}

/** "a, b, and c" / "a, b y c" — never assembled by joining with a comma. */
export function formatList(items: readonly string[], locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.ListFormat(tag(locale), { style: "long", type: "conjunction" }).format(items);
}

/** A signed integer, so a message never has to concatenate its own sign. */
export function formatSigned(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return `${value > 0 ? "+" : ""}${formatNumber(value, 0, locale)}`;
}

export function titleCase(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
