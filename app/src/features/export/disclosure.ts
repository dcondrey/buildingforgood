/**
 * The one line every export carries.
 *
 * It is one sentence because it has to survive being read at 6am, printed at
 * the bottom of a page, and pasted into an email without its surroundings.
 * It is defined once — as one catalogue key, `export.disclosureLine` — because
 * a disclosure that exists in four slightly different versions is a disclosure
 * nobody can be held to, and a disclosure that exists in only one language is
 * a disclosure only some readers are owed.
 *
 * This constant is the English text, kept so a caller with no translator (a
 * script, a test) still emits the sentence rather than nothing.
 * `i18n/i18n.test.tsx` pins it to the catalogue so the two cannot drift.
 */
export const PLAN_DISCLOSURE_LINE =
  "Planning aid for human review. It allocates staff time only: it does not authorize enforcement, does not track people, does not establish cause, and does not decide who is eligible for any service.";
