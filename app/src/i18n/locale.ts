/**
 * The locales this build ships, and the one fact each one carries beyond its
 * message catalogue: the BCP 47 tag `Intl` formats its numbers and dates with.
 *
 * `es-US` rather than `es-ES` is deliberate. This tool is read in San Diego,
 * where a Spanish-speaking coordinator reads the same digits an English-
 * speaking one does: `es-US` groups thousands with a comma and takes a period
 * for the decimal, exactly as `en-US` does, so switching language never
 * silently reformats a number a reader is checking against the artifact.
 */

export const LOCALES = ["en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Persisted like the view preference, under the same `stillhere-` prefix. */
export const LOCALE_STORAGE_KEY = "stillhere-locale";

export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  es: "es-US",
};

/** Each language named in itself, which is the only name a reader can use. */
export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // No storage in this environment; the default applies for this visit.
  }
  return DEFAULT_LOCALE;
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The choice simply resets next visit.
  }
}
