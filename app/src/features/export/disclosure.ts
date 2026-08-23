/**
 * The one line every export carries.
 *
 * It is one sentence because it has to survive being read at 6am, printed at
 * the bottom of a page, and pasted into an email without its surroundings.
 * It is defined once because a disclosure that exists in four slightly
 * different versions is a disclosure nobody can be held to.
 */
export const PLAN_DISCLOSURE_LINE =
  "Planning aid for human review. It allocates staff time only: it does not authorize enforcement, does not track people, does not establish cause, and does not decide who is eligible for any service.";

/** Names the frozen artifact an export was produced from. */
export function exportProvenanceLine(
  sourceLabel: string,
  artifact: string,
  through: string,
): string {
  return `Source: ${sourceLabel} · artifact ${artifact} · source data through ${through}. Aggregate place-level evidence; no block records, no block-level geometry, no person-level data.`;
}
