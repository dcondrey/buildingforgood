import type { DemoData } from "../../lib/demo";
import { formatNumber } from "../../lib/format";

export function EvidenceChain({ data }: { data: DemoData }) {
  const steps = [
    {
      label: "Verified source",
      detail: data.source.artifact.split("/").pop() ?? data.source.artifact,
      tone: "teal",
    },
    {
      label: "Comparable panel",
      detail: `${data.signal.panelSize} fixed blocks · same method`,
      tone: "teal",
    },
    {
      label: "Audited scenario",
      detail: `${data.forecast.intervalPoints} held-out folds · ${formatNumber(data.forecast.coverage)}% coverage`,
      tone: "amber",
    },
    {
      label: "Human review",
      detail: "Coordinator decides",
      tone: "amber",
    },
  ];

  return (
    <ol aria-label="Evidence and decision chain" className="evidence-chain">
      {steps.map((step, index) => (
        <li className={`evidence-chain-step chain-${step.tone}`} key={step.label}>
          <span aria-hidden="true" className="chain-node">
            {index + 1}
          </span>
          <span className="chain-copy">
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </span>
          {index < steps.length - 1 && <span aria-hidden="true" className="chain-connector" />}
        </li>
      ))}
    </ol>
  );
}
