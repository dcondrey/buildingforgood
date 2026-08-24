/**
 * One screen: the plan, what was delivered against it, and the plan's error.
 *
 * This is the far end of the monthly loop. A plan allocates staff hours; a
 * month happens; the operating organization reports what was actually worked;
 * this panel puts the two columns side by side and subtracts them. Everything
 * on it is either a figure the operator supplied or a subtraction of two of
 * them — there is no model here, and the panel says so on screen rather than
 * only in a comment.
 *
 * Three things it deliberately does not do, each of which had to be decided
 * rather than defaulted:
 *
 * - **No total.** A sum across areas or months would reopen subtraction
 *   recovery of a suppressed count, so the row is the published grain.
 * - **No zeros standing in for absence.** A month with no plan shows as
 *   unresolved; an area with no row shows as absent; a withheld count shows as
 *   withheld. None of the three is rendered as a number.
 * - **No forecast score.** `NOT_SCORABLE_FROM_ACTUALS` records why, and the
 *   panel renders every entry of it, so emptying that record to make the loop
 *   look closed takes the disclosure off the screen and fails the test that
 *   counts them.
 *
 * Presentational apart from the file it holds: everything about the deployment
 * arrives as props, so the panel renders in a test without the shell.
 */

import { useId, useMemo, useState, type ChangeEvent } from "react";

import {
  NOT_SCORABLE_FROM_ACTUALS,
  compareMonth,
  hasRecordedActuals,
  ingestActuals,
  latestMonth,
  monthsReported,
  type ActualsDocument,
  type ActualsIngestResult,
  type ActualsIssue,
  type AreaMonthComparison,
} from "../../domain/actuals";
import { useTranslation } from "../../i18n/context";
import { ActualsEmptyState } from "./ActualsEmptyState";
import { readStoredActuals, writeStoredActuals } from "./actualsStore";

export interface ActualsPanelProps {
  /** The deployment's profile id. Actuals for another profile are refused. */
  profileId: string;
  /** In-scope area ids, in the profile's order. Fixes the row order. */
  areaIds: readonly string[];
  areaLabels: ReadonlyMap<string, string>;
  organizationName?: string;
  docsHref?: string;
  headingLevel?: 2 | 3 | 4;
}

interface LoadedState {
  document: ActualsDocument | null;
  errors: ActualsIssue[];
  warnings: ActualsIssue[];
  fileName: string;
}

const EMPTY: LoadedState = { document: null, errors: [], warnings: [], fileName: "" };

/**
 * The one entry in `NOT_SCORABLE_FROM_ACTUALS` each copy key answers to.
 *
 * Pairing them here rather than deriving a key from the record's own names is
 * what makes the test able to fail: a new entry with no sentence beside it is
 * a limitation the screen would not disclose.
 */
const NOT_SCORABLE_COPY: Record<string, string> = {
  count_forecast: "actuals.compare.notScorableCountForecast",
  engagement_response: "actuals.compare.notScorableEngagementResponse",
  area_change: "actuals.compare.notScorableAreaChange",
};

export function ActualsPanel({
  profileId,
  areaIds,
  areaLabels,
  organizationName,
  docsHref,
  headingLevel = 2,
}: ActualsPanelProps) {
  const { t, number, date, list } = useTranslation();

  const headingId = useId();
  const inputId = useId();
  const monthId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  const options = useMemo(
    () => ({ expectedProfileId: profileId, knownAreaIds: [...areaIds] }),
    [profileId, areaIds],
  );

  // Anything already in this browser is re-read from its text, not trusted as
  // a parsed document: the stored copy takes the same door as a new file.
  const [state, setState] = useState<LoadedState>(() => {
    const stored = readStoredActuals();
    if (stored === null || stored.profileId !== profileId) return EMPTY;
    return apply(ingestActuals(stored.text, options), stored.fileName);
  });
  const [month, setMonth] = useState<string | null>(null);

  function apply(result: ActualsIngestResult, fileName: string): LoadedState {
    return {
      document: result.ok ? result.document : null,
      errors: result.errors,
      warnings: result.warnings,
      fileName,
    };
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    const text = await file.text();
    const result = ingestActuals(text, options);
    setState(apply(result, file.name));
    setMonth(null);
    writeStoredActuals(result.ok ? { profileId, fileName: file.name, text } : null);
  }

  function onClear() {
    setState(EMPTY);
    setMonth(null);
    writeStoredActuals(null);
  }

  const loaded = state.document;
  const months = loaded === null ? [] : monthsReported(loaded);
  const shownMonth = month ?? (loaded === null ? null : latestMonth(loaded));
  const comparison =
    loaded === null || shownMonth === null ? null : compareMonth(loaded, shownMonth, areaIds);

  const label = (areaId: string) => areaLabels.get(areaId) ?? areaId;

  return (
    <section
      aria-labelledby={headingId}
      data-state={loaded === null ? "actuals-panel-empty" : "actuals-panel-loaded"}
    >
      <p className="eyebrow">{t("actuals.compare.eyebrow")}</p>
      <Heading id={headingId}>{t("actuals.compare.title")}</Heading>
      <p>{t("actuals.compare.intro")}</p>

      <p>
        <label htmlFor={inputId}>{t("actuals.compare.loadLabel")}</label>
        <input accept="application/json,.json" id={inputId} onChange={onFile} type="file" />
      </p>
      <p>{t("actuals.compare.loadHint")}</p>

      {state.errors.length > 0 && (
        <div data-state="actuals-refused" role="alert">
          <h3>{t("actuals.compare.refusedTitle")}</h3>
          <p>{t("actuals.compare.refusedIntro")}</p>
          <ul>
            {state.errors.map((issue) => (
              <li key={`${issue.field}:${issue.message}`}>
                <code>{issue.field}</code> — {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loaded !== null && state.warnings.length > 0 && (
        <div data-state="actuals-warnings">
          <h3>{t("actuals.compare.warningsTitle")}</h3>
          <p>{t("actuals.compare.warningsIntro")}</p>
          <ul>
            {state.warnings.map((issue) => (
              <li key={`${issue.field}:${issue.message}`}>
                <code>{issue.field}</code> — {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(loaded === null || !hasRecordedActuals(loaded)) && (
        <ActualsEmptyState
          docsHref={docsHref}
          headingLevel={headingLevel === 2 ? 3 : 4}
          measureLabel={loaded?.engagement_measure.label}
          organizationName={organizationName}
        />
      )}

      {loaded !== null && comparison !== null && (
        <>
          <p>
            {t("actuals.compare.reportedBy", {
              role: loaded.reporting.reported_by_role,
              who: loaded.reporting.organization_name,
              date: date(loaded.reporting.last_updated),
            })}
          </p>
          <p>{t("actuals.compare.method", { method: loaded.reporting.method_note })}</p>
          <p>
            {t("actuals.compare.measure", {
              label: loaded.engagement_measure.label,
              definition: loaded.engagement_measure.definition,
            })}
          </p>

          <p>
            <label htmlFor={monthId}>{t("actuals.compare.monthLabel")}</label>
            <select
              id={monthId}
              onChange={(event) => setMonth(event.target.value)}
              value={shownMonth ?? ""}
            >
              {months.map((one) => (
                <option key={one} value={one}>
                  {one}
                </option>
              ))}
            </select>
          </p>

          <table>
            <caption>{t("actuals.compare.tableCaption", { month: shownMonth ?? "" })}</caption>
            <thead>
              <tr>
                <th scope="col">{t("actuals.compare.colArea")}</th>
                <th scope="col">{t("actuals.compare.colPlanned")}</th>
                <th scope="col">{t("actuals.compare.colDelivered")}</th>
                <th scope="col">{t("actuals.compare.colError")}</th>
                <th scope="col">
                  {t("actuals.compare.colEngagement", {
                    measure: loaded.engagement_measure.label,
                  })}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr key={row.area_id}>
                  <th scope="row">{label(row.area_id)}</th>
                  <td>
                    {row.planned_hours === null
                      ? t("actuals.compare.plannedNone")
                      : number(row.planned_hours, 1)}
                  </td>
                  <td>{number(row.delivered_hours, 1)}</td>
                  <td>{planError(row)}</td>
                  <td>{engagement(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {comparison.areas_without_a_row.length > 0 && (
            <div data-state="actuals-absent">
              <h3>{t("actuals.compare.absentTitle", { month: shownMonth ?? "" })}</h3>
              <p>
                {t("actuals.compare.absentBody", {
                  areas: list(comparison.areas_without_a_row.map(label)),
                })}
              </p>
            </div>
          )}

          <h3>{t("actuals.compare.noTotal")}</h3>
          <p>{t("actuals.compare.noTotalBody")}</p>

          <h3>{t("actuals.compare.notScorableTitle")}</h3>
          <ul data-state="actuals-not-scorable">
            {Object.keys(NOT_SCORABLE_FROM_ACTUALS).map((entry) => (
              <li key={entry} data-entry={entry}>
                {NOT_SCORABLE_COPY[entry] === undefined
                  ? NOT_SCORABLE_FROM_ACTUALS[entry]
                  : t(NOT_SCORABLE_COPY[entry])}
              </li>
            ))}
          </ul>

          <p>{t("actuals.compare.storedNote")}</p>
          <p>
            <button onClick={onClear} type="button">
              {t("actuals.compare.clear")}
            </button>
          </p>
        </>
      )}
    </section>
  );

  function planError(row: AreaMonthComparison): string {
    const error = row.plan_error_hours;
    if (error === null) return t("actuals.compare.errorUnresolved");
    if (error === 0) return t("actuals.compare.errorOnPlan");
    const hours = number(Math.abs(error), 1);
    return error > 0
      ? t("actuals.compare.errorUnder", { hours })
      : t("actuals.compare.errorOver", { hours });
  }

  function engagement(row: AreaMonthComparison): string {
    if (row.engagement.suppressed) return t("actuals.compare.engagementSuppressed");
    if (row.engagement.count === null) return t("actuals.compare.engagementNotRecorded");
    return number(row.engagement.count, 0);
  }
}
