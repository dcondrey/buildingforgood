import { useShell } from "../shell/ShellContext";
import { useTranslation } from "../../i18n/context";
import { readableToken } from "../../i18n/plannerText";
import "./currency.css";

/**
 * What the artifact says about its own age, and what has been observed since
 * it froze without being allowed to change it.
 *
 * Every sentence in the excluded lane is the artifact's own, rendered
 * unedited — and therefore in the artifact's own language. The one paragraph
 * written here says what the rows are not, because that is the reading the
 * rows invite and the one that would do damage: a reader who takes them for a
 * correction, a forecast, or fresher truth has been misled by the interface,
 * not by the publisher.
 */
export function CurrencyPanel() {
  const { data } = useShell();
  const { t, tx, number, list } = useTranslation();
  const currency = data.currency;
  const excluded = currency?.excluded ?? null;
  const stale = currency?.status === "stale";
  const excludedTableCaption = excluded
    ? t("currency.tableCaption", {
        uses: list(excluded.excludedFrom.map((token) => readableToken(t, token))),
        unit: readableToken(t, excluded.unit),
      })
    : "";
  return (
    <section aria-labelledby="currency-title" className="currency-panel" id="currency">
      <div className="currency-head">
        <div>
          <span className="eyebrow">{t("currency.eyebrow")}</span>
          <h3 id="currency-title">
            {currency
              ? t("currency.currentThrough", { month: currency.sourceDataThrough })
              : t("currency.unknownBadge")}
          </h3>
        </div>
        <span className={!currency ? "review-status" : stale ? "wide-warning" : "selected-chip"}>
          {!currency
            ? t("currency.chipNone")
            : stale
              ? t("currency.chipOverdue")
              : t("currency.chipCurrent")}
        </span>
      </div>

      {!currency && <p>{t("currency.noBlock")}</p>}

      {currency && currency.stalenessReason && <p>{currency.stalenessReason}</p>}

      {currency?.nextPublication && (
        <p className="currency-next">
          {t("currency.nextRefresh", {
            month: currency.nextPublication.month,
            basis: currency.nextPublication.basis,
          })}{" "}
          {currency.nextPublication.scheduled ? null : currency.nextPublication.note}
        </p>
      )}

      {stale && <p className="currency-while-late">{tx("currency.whileLate")}</p>}

      <p className="currency-frozen">{tx("currency.frozen")}</p>

      {excluded && (
        <div className="currency-excluded">
          <div className="currency-excluded-head">
            <span className="eyebrow">{t("currency.excludedEyebrow")}</span>
            <h4>{excluded.headline}</h4>
          </div>

          <p>{excluded.summary}</p>

          <p className="currency-guard">{t("currency.guard")}</p>

          {excluded.grounds.length > 0 && (
            <>
              <p className="currency-grounds-lead">{t("currency.groundsLead")}</p>
              <ul className="currency-grounds">
                {excluded.grounds.map((ground) => (
                  <li key={ground}>{ground}</li>
                ))}
              </ul>
            </>
          )}

          {excluded.promotionRule && (
            <p className="currency-rule">
              <strong>{t("currency.promotionRuleLabel")}</strong> {excluded.promotionRule}
            </p>
          )}

          <details className="context-details">
            <summary>
              <span>{t("currency.viewRows", { count: excluded.rows.length })}</span>
              <small>{excluded.months.join(" · ")}</small>
            </summary>
            <div
              aria-label={excludedTableCaption}
              className="table-scroll"
              role="region"
              tabIndex={0}
            >
              <table>
                <caption>{excludedTableCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("currency.thMonth")}</th>
                    <th scope="col">{t("currency.thArea")}</th>
                    <th scope="col">{t("currency.thSeries")}</th>
                    <th scope="col">{t("currency.thValue")}</th>
                    <th scope="col">{t("currency.thReportedAs")}</th>
                    <th scope="col">{t("currency.thModelInput")}</th>
                  </tr>
                </thead>
                <tbody>
                  {excluded.rows.map((row) => (
                    <tr key={`${row.month}-${row.series}-${row.geography}`}>
                      <th scope="row">{row.month}</th>
                      <td>{row.geography}</td>
                      <td>{readableToken(t, row.series)}</td>
                      <td>{number(row.value)}</td>
                      <td>{readableToken(t, row.valueStatus)}</td>
                      <td>{t("currency.excludedCell")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {excluded.source && (
            <p className="currency-source">
              {tx("currency.sourceNote", { file: excluded.source })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
