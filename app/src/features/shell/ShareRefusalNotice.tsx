import { useShell } from "./ShellContext";
import "./shell-notices.css";

/**
 * A shared link this build would not read.
 *
 * The failure it exists to prevent: every refusal used to be swallowed, so a
 * recipient whose link was truncated at a line wrap, entity-escaped by a mail
 * composer, or clipped by a quoted reply was shown a fully rendered default
 * plan with nothing to distinguish it from the sender's. Two people then
 * discuss "the plan in the link" while looking at different plans. Saying
 * which field failed, and that this is the default, is the whole fix.
 */
export function ShareRefusalNotice() {
  const { shareRefusal } = useShell();
  if (!shareRefusal) return null;
  const geography = shareRefusal.field === "geography";
  return (
    <aside aria-label="Shared link" className="share-refusal">
      <span className="eyebrow">Shared link</span>
      {geography ? (
        <p>
          This link was built against a different list of areas ({shareRefusal.detail}). Hours and
          area names do not carry across geographies, so it was not applied. You are looking at the
          default plan for this deployment, not the sender&apos;s.
        </p>
      ) : (
        <p>
          This link could not be read ({shareRefusal.field}: {shareRefusal.detail}). You are looking
          at the default plan, not the sender&apos;s. Ask them to send the link again, unwrapped and
          unshortened.
        </p>
      )}
    </aside>
  );
}
