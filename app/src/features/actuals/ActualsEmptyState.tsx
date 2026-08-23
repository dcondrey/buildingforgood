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
 * The one thing it does read is the locale, which defaults to English when it
 * is rendered outside the shell.
 */

import { useId } from "react";

import { useTranslation } from "../../i18n/context";

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
  measureLabel,
  organizationName,
  docsHref = "docs/project/ACTUALS.md",
  headingLevel = 3,
}: ActualsEmptyStateProps) {
  const headingId = useId();
  const { t, tx } = useTranslation();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const who = organizationName ?? t("actuals.defaultWho");
  const measure = measureLabel ?? t("actuals.defaultMeasure");

  return (
    <section aria-labelledby={headingId} data-state="actuals-empty">
      <Heading id={headingId}>{t("actuals.title")}</Heading>

      <p>{t("actuals.lede")}</p>

      <p>{t("actuals.wouldSupply", { who })}</p>
      <ul>
        <li>
          <strong>{t("actuals.plannedHours")}</strong> — {t("actuals.plannedHoursText")}
        </li>
        <li>
          <strong>{t("actuals.deliveredHours")}</strong> — {t("actuals.deliveredHoursText")}
        </li>
        <li>
          <strong>{t("actuals.engagementCount")}</strong> —{" "}
          {t("actuals.engagementCountText", { measure })}
        </li>
      </ul>

      <p>{tx("actuals.format")}</p>

      <p>{tx("actuals.instructions", { docs: docsHref })}</p>
    </section>
  );
}
