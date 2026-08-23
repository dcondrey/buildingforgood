import { useShell } from "../../features/shell/ShellContext";
import { formatDate } from "../../lib/format";

export function DisclosurePanel() {
  const { data, setDisclosuresOpen } = useShell();
  return (
    <aside
      aria-label="Data and limitation disclosures"
      className="disclosure-drawer"
      id="disclosures"
    >
      <div>
        <span className="eyebrow">Local artifact</span>
        <h2>Traceable by design</h2>
      </div>
      <dl>
        <div>
          <dt>Source</dt>
          <dd>{data.source.label}</dd>
        </div>
        <div>
          <dt>Coverage through</dt>
          <dd>{formatDate(data.source.retrievedAt)}</dd>
        </div>
        <div>
          <dt>Loaded from</dt>
          <dd>
            <code>{data.source.artifact}</code>
          </dd>
        </div>
        <div>
          <dt>Privacy</dt>
          <dd>
            No block records or block-level geometry; the map draws simplified neighborhood
            boundaries only. Small per-area component cells are omitted.
          </dd>
        </div>
        <div>
          <dt>AI use</dt>
          <dd>
            Development assistance only; no AI runs in the product or determines evidence,
            forecasts, or allocations.
          </dd>
        </div>
        <div>
          <dt>Non-goal</dt>
          <dd>No tracking, enforcement, eligibility, or automatic dispatch.</dd>
        </div>
        <div>
          <dt>Pending requests</dt>
          <dd>
            Data requests are pending with the San Diego Housing Commission, the Regional Task Force
            on Homelessness, the City&apos;s Homelessness Strategies &amp; Solutions department, and
            DSDP Clean &amp; Safe. Responsive records enter the source ledger&apos;s documented
            lanes before any analytical use.
          </dd>
        </div>
      </dl>
      <button
        aria-label="Close data and limits"
        className="drawer-close"
        onClick={() => setDisclosuresOpen(false)}
        type="button"
      >
        ×
      </button>
    </aside>
  );
}
