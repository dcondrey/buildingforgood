import { useShell } from "./ShellContext";
import { useTranslation } from "../../i18n/context";
import "./shell-notices.css";

const STATUS_KEYS: Record<string, string> = {
  resolved: "geo.statusResolved",
  provisional: "geo.statusProvisional",
  unresolved: "geo.statusUnresolved",
  illustrative: "geo.statusIllustrative",
};

const COMPONENT_KEYS: Record<string, string> = {
  area_list: "geo.componentAreaList",
  boundaries: "geo.componentBoundaries",
  adjacency: "geo.componentAdjacency",
};

/**
 * Where this deployment's areas come from, and which parts of its geography
 * have no citable source.
 *
 * Not a warning: an unresolved boundary is a publishable, ordinary state, and
 * the profile carries the sentence that says what it costs. It reads as a
 * disclosure a reader opens, in the same register as the other cards.
 */
export function GeographyProvenance() {
  const { deployment, places, unobservedAreaNames } = useShell();
  const { t, tx, list } = useTranslation();
  const unresolved = deployment.unresolvedGeography;
  return (
    <details className="context-details geography-provenance">
      <summary>
        <span>{t("geo.summary", { theseAreas: places.these })}</span>
        <small>
          {unresolved.length === 0
            ? t("geo.resolved", { count: deployment.areaCount })
            : t("geo.unresolved", {
                count: deployment.areaCount,
                unresolved: unresolved.length,
              })}
        </small>
      </summary>
      <p>{deployment.scopeStatement}</p>
      {deployment.jurisdictionNote && <p>{deployment.jurisdictionNote}</p>}
      {unobservedAreaNames.length > 0 && (
        <p>{t("geo.unobserved", { areas: list(unobservedAreaNames) })}</p>
      )}
      <dl className="geography-components">
        {unresolved.map((component) => (
          <div key={component.component}>
            <dt>
              {COMPONENT_KEYS[component.component]
                ? t(COMPONENT_KEYS[component.component])
                : component.label}
              <span>
                {STATUS_KEYS[component.status]
                  ? t(STATUS_KEYS[component.status])
                  : component.status}
              </span>
            </dt>
            <dd>
              {component.note}
              <em>{component.rule}</em>
            </dd>
          </div>
        ))}
      </dl>
      <p className="geography-source">
        {tx("geo.source", {
          version: deployment.areaListVersion,
          profileId: deployment.profileId,
        })}
      </p>
    </details>
  );
}
