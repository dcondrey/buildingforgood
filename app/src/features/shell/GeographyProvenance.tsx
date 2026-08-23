import { useShell } from "./ShellContext";
import "./shell-notices.css";

const STATUS_WORDS: Record<string, string> = {
  resolved: "resolved",
  provisional: "provisional",
  unresolved: "no citable source",
  illustrative: "invented for illustration",
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
  const { deployment, unobservedAreaNames } = useShell();
  const unresolved = deployment.unresolvedGeography;
  return (
    <details className="context-details geography-provenance">
      <summary>
        <span>How these {deployment.areaNounPlural} are defined</span>
        <small>
          {deployment.areaCount} in scope ·{" "}
          {unresolved.length === 0
            ? "provenance resolved"
            : `${unresolved.length} of 3 components unresolved`}
        </small>
      </summary>
      <p>{deployment.scopeStatement}</p>
      {deployment.jurisdictionNote && <p>{deployment.jurisdictionNote}</p>}
      {unobservedAreaNames.length > 0 && (
        <p>
          The loaded artifact carries no observation for {unobservedAreaNames.join(", ")}. Those
          areas receive the guaranteed minimum and no forecast weight, and the evidence and forecast
          sections describe the artifact&apos;s own geography rather than this one.
        </p>
      )}
      <dl className="geography-components">
        {unresolved.map((component) => (
          <div key={component.component}>
            <dt>
              {component.label}
              <span>{STATUS_WORDS[component.status] ?? component.status}</span>
            </dt>
            <dd>
              {component.note}
              <em>{component.rule}</em>
            </dd>
          </div>
        ))}
      </dl>
      <p className="geography-source">
        Area list {deployment.areaListVersion}, from the organization profile{" "}
        <code>{deployment.profileId}</code>. Every operating number on this page — budget, floor,
        continuity reserve, allocation increment, team count, and the assumed hourly rate — comes
        from that file.
      </p>
    </details>
  );
}
