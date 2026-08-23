import { useShell } from "../../features/shell/ShellContext";
import { useTranslation } from "../../i18n/context";

export function DisclosurePanel() {
  const { data, deployment, places, setDisclosuresOpen } = useShell();
  const { t, tx, date } = useTranslation();
  const currency = data.currency;
  return (
    <aside aria-label={t("disclosure.aria")} className="disclosure-drawer" id="disclosures">
      <div>
        <span className="eyebrow">{t("disclosure.eyebrow")}</span>
        <h2>{t("disclosure.title")}</h2>
      </div>
      <dl>
        <div>
          <dt>{t("disclosure.source")}</dt>
          <dd>{data.source.label}</dd>
        </div>
        <div>
          <dt>{t("disclosure.currency")}</dt>
          <dd>
            {currency
              ? t(
                  currency.status === "stale"
                    ? "disclosure.currencyOverdue"
                    : "disclosure.currencyOnCadence",
                  { month: currency.sourceDataThrough },
                )
              : t("disclosure.currencyNone")}
          </dd>
        </div>
        <div>
          <dt>{t("disclosure.coverageThrough")}</dt>
          <dd>{date(data.source.retrievedAt)}</dd>
        </div>
        <div>
          <dt>{t("disclosure.loadedFrom")}</dt>
          <dd>
            <code>{data.source.artifact}</code>
          </dd>
        </div>
        <div>
          <dt>{t("disclosure.organizationProfile")}</dt>
          <dd>
            {tx("disclosure.organizationProfileValue", {
              organization: deployment.organizationName,
              profileId: deployment.profileId,
              role: deployment.ownerRole.toLowerCase(),
            })}
          </dd>
        </div>
        <div>
          <dt>{t("disclosure.operatingParameters")}</dt>
          <dd>
            {t("disclosure.operatingParametersValue", {
              areaCount: deployment.areaCount,
              areaNounPlural: places.nounPlural,
              budget: deployment.defaultBudget,
              horizonLabel: deployment.planningHorizonLabel,
              horizonDays: deployment.planningHorizonDays,
              floor: deployment.coverageFloor,
              reserve: deployment.continuityReserve,
              increment: deployment.allocationIncrement,
              teams: deployment.teamCount,
              shift: deployment.shiftLengthHours,
            })}
          </dd>
        </div>
        <div>
          <dt>{t("disclosure.privacy")}</dt>
          <dd>{t("disclosure.privacyValue")}</dd>
        </div>
        <div>
          <dt>{t("disclosure.aiUse")}</dt>
          <dd>{t("disclosure.aiUseValue")}</dd>
        </div>
        <div>
          <dt>{t("disclosure.nonGoal")}</dt>
          <dd>{t("disclosure.nonGoalValue")}</dd>
        </div>
        <div>
          <dt>{t("disclosure.pendingRequests")}</dt>
          <dd>{t("disclosure.pendingRequestsValue")}</dd>
        </div>
      </dl>
      <button
        aria-label={t("disclosure.close")}
        className="drawer-close"
        onClick={() => setDisclosuresOpen(false)}
        type="button"
      >
        ×
      </button>
    </aside>
  );
}
