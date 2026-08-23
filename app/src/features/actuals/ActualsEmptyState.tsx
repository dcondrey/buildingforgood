/**
 * The "no actuals recorded yet" state.
 *
 * This is the state every new deployment starts in and the state this
 * repository is in today: no operator has reported a delivered hour to it.
 * That is worth saying plainly on the screen rather than hiding behind an
 * empty table, a zero, or a chart with no line in it — a reader who sees a
 * blank panel assumes the tool is broken, and a reader who sees a zero
 * assumes no outreach happened.
 *
 * Presentational and self-contained on purpose: it takes everything it says
 * as props, holds no state, imports no styling, and reaches for no globals,
 * so the workstream that owns the shell can drop it in without untangling it.
 */

import { useId } from "react";

export interface ActualsEmptyStateProps {
  /** The operator's own name for their engagement measure, e.g. `street contacts`. */
  measureLabel?: string;
  /** Named in the copy when known, so the ask lands on someone. */
  organizationName?: string;
  /** Where the full instructions live. */
  docsHref?: string;
  /** Heading level, so the component fits whatever outline hosts it. */
  headingLevel?: 2 | 3 | 4;
}

export function ActualsEmptyState({
  measureLabel = "contacts or engagements",
  organizationName,
  docsHref = "docs/project/ACTUALS.md",
  headingLevel = 3,
}: ActualsEmptyStateProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const who = organizationName ?? "The operating organization";

  return (
    <section aria-labelledby={headingId} data-state="actuals-empty">
      <Heading id={headingId}>No actuals recorded yet</Heading>

      <p>
        Nothing here is missing or broken. No one has reported delivered hours to this deployment,
        so there is nothing to show — and an empty month is not a month with zero outreach.
      </p>

      <p>{who} would supply, once a month, one row per planning area:</p>
      <ul>
        <li>
          <strong>Planned hours</strong> — the staff hours the plan called for in that area.
        </li>
        <li>
          <strong>Delivered hours</strong> — the staff hours actually worked there. Zero is a real
          answer and the one most worth recording honestly.
        </li>
        <li>
          <strong>One engagement count</strong> — {measureLabel}, in whatever the organization
          already counts. A number of encounters, never a list of people. Counts of one to four are
          withheld under the same small-cell rule that governs every other number here, and show as
          withheld rather than as zero.
        </li>
      </ul>

      <p>
        The format is one JSON file against <code>config/schema/actuals.v1.schema.json</code>, at
        area-and-month grain. Names, dates of birth, client or case identifiers, case-management
        exports, addresses, coordinates, and any per-person or per-encounter row are refused at
        import: this tool has no concept of a person as an entity and is not the place to build one.
      </p>

      <p>
        Full instructions, including what will and will not later be computed from these numbers,
        are in <code>{docsHref}</code>.
      </p>
    </section>
  );
}
