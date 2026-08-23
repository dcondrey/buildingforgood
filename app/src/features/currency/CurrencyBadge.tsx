import { useShell } from "../shell/ShellContext";
import "./currency.css";

/**
 * How current the artifact is, stated in the chrome rather than buried.
 *
 * Three states, and the third is not a failure: an artifact with no currency
 * block cannot be graded for freshness, and saying so is more honest than
 * inferring a date from a retrieval timestamp.
 */
export function CurrencyBadge() {
  const { data } = useShell();
  const currency = data.currency;
  if (!currency) {
    return (
      <span className="currency-badge currency-unknown">
        Currency unknown
        <small>this artifact states no currency</small>
      </span>
    );
  }
  const stale = currency.status === "stale";
  return (
    <a
      className={`currency-badge ${stale ? "currency-stale" : "currency-current"}`}
      href="#currency"
    >
      Current through {currency.sourceDataThrough}
      <small>{stale ? "publication overdue" : "publication on cadence"}</small>
    </a>
  );
}
