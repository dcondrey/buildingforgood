import { useShell } from "../shell/ShellContext";
import { formatNumber } from "../../lib/format";
import "./currency.css";

function readable(token: string): string {
  return token.replaceAll("_", " ");
}

/**
 * What the artifact says about its own age, and what has been observed since
 * it froze without being allowed to change it.
 *
 * Every sentence in the excluded lane is the artifact's own, rendered
 * unedited. The one paragraph written here says what the rows are not,
 * because that is the reading the rows invite and the one that would do
 * damage: a reader who takes them for a correction, a forecast, or fresher
 * truth has been misled by the interface, not by the publisher.
 */
export function CurrencyPanel() {
  const { data } = useShell();
  const currency = data.currency;
  const excluded = currency?.excluded ?? null;
  const stale = currency?.status === "stale";
  return (
    <section aria-labelledby="currency-title" className="currency-panel" id="currency">
      <div className="currency-head">
        <div>
          <span className="eyebrow">Artifact currency</span>
          <h3 id="currency-title">
            {currency ? `Current through ${currency.sourceDataThrough}` : "Currency unknown"}
          </h3>
        </div>
        <span className={!currency ? "review-status" : stale ? "wide-warning" : "selected-chip"}>
          {!currency ? "No currency stated" : stale ? "Publication overdue" : "Publication current"}
        </span>
      </div>

      {!currency && (
        <p>
          This artifact carries no currency block, so this build cannot say how far behind the
          calendar it is. The offline snapshot compiled into the bundle is always in this state. Run
          the monthly refresh to produce an artifact that states its own age.
        </p>
      )}

      {currency && currency.stalenessReason && <p>{currency.stalenessReason}</p>}

      {currency?.nextPublication && (
        <p className="currency-next">
          {`Next refresh expected ${currency.nextPublication.month} on ${currency.nextPublication.basis}.`}{" "}
          {currency.nextPublication.scheduled ? null : currency.nextPublication.note}
        </p>
      )}

      <p className="currency-frozen">
        <strong>The January 2026 replay stays frozen, permanently.</strong> It is the methods
        exhibit — the one month this project grades itself on, using only data that existed before
        it. A newer artifact never replaces it, and nothing below is allowed to regrade it.
      </p>

      {excluded && (
        <div className="currency-excluded">
          <div className="currency-excluded-head">
            <span className="eyebrow">Observed · not model-eligible</span>
            <h4>{excluded.headline}</h4>
          </div>

          <p>{excluded.summary}</p>

          <p className="currency-guard">
            These are excluded observations. They are not a forecast, not a correction, and not
            newer data that supersedes the replay above. The values are multiplier-adjusted
            person-equivalents from a publisher whose cadence broke. No row here trains a model,
            selects a model, or moves a staff-hour.
          </p>

          {excluded.grounds.length > 0 && (
            <>
              <p className="currency-grounds-lead">Why they are excluded:</p>
              <ul className="currency-grounds">
                {excluded.grounds.map((ground) => (
                  <li key={ground}>{ground}</li>
                ))}
              </ul>
            </>
          )}

          {excluded.promotionRule && (
            <p className="currency-rule">
              <strong>Promotion rule.</strong> {excluded.promotionRule}
            </p>
          )}

          <details className="context-details">
            <summary>
              <span>View the {excluded.rows.length} excluded rows</span>
              <small>{excluded.months.join(" · ")}</small>
            </summary>
            <div className="table-scroll">
              <table>
                <caption>
                  Observed and excluded from {excluded.excludedFrom.map(readable).join(", ")}.
                  Values are {readable(excluded.unit)}, not counts of people.
                </caption>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Area</th>
                    <th>Series</th>
                    <th>Value</th>
                    <th>Reported as</th>
                    <th>Model input</th>
                  </tr>
                </thead>
                <tbody>
                  {excluded.rows.map((row) => (
                    <tr key={`${row.month}-${row.series}-${row.geography}`}>
                      <th scope="row">{row.month}</th>
                      <td>{row.geography}</td>
                      <td>{readable(row.series)}</td>
                      <td>{formatNumber(row.value)}</td>
                      <td>{readable(row.valueStatus)}</td>
                      <td>Excluded</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {excluded.source && (
            <p className="currency-source">
              Transcription, provenance, and the update protocol are recorded in{" "}
              <code>{excluded.source}</code>.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
