import type { DemoData } from "../../lib/demo";
import { useTranslation } from "../../i18n/context";

export function EvidenceChain({ data }: { data: DemoData }) {
  const { t, number } = useTranslation();
  const steps = [
    {
      label: t("chain.verifiedSource"),
      detail: data.source.artifact.split("/").pop() ?? data.source.artifact,
      tone: "teal",
    },
    {
      label: t("chain.comparablePanel"),
      detail: t("chain.comparablePanelDetail", { panel: data.signal.panelSize }),
      tone: "teal",
    },
    {
      label: t("chain.auditedScenario"),
      detail: t("chain.auditedScenarioDetail", {
        folds: data.forecast.intervalPoints,
        coverage: number(data.forecast.coverage),
      }),
      tone: "amber",
    },
    {
      label: t("chain.humanReview"),
      detail: t("chain.humanReviewDetail"),
      tone: "amber",
    },
  ];

  return (
    <ol aria-label={t("chain.aria")} className="evidence-chain">
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
