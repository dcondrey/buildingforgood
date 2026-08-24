/**
 * The panel, wired to whichever deployment is running.
 *
 * Thin on purpose. Everything the comparison needs about the geography — which
 * areas are in scope, in what order, under what names, for which profile —
 * already exists on the deployment, and passing it down as props is what keeps
 * `ActualsPanel` renderable in a test without a shell around it.
 */

import { useShell } from "../shell/ShellContext";
import { ActualsPanel } from "./ActualsPanel";

export function ActualsSection() {
  const { deployment } = useShell();
  return (
    <section className="decision-section" id="actuals">
      <ActualsPanel
        areaIds={deployment.areaIds}
        areaLabels={deployment.areaLabels}
        headingLevel={2}
        organizationName={deployment.organizationName}
        profileId={deployment.profileId}
      />
    </section>
  );
}
