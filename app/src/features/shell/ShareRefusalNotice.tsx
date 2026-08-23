import { useShell } from "./ShellContext";
import { useTranslation } from "../../i18n/context";
import { shareRefusalDetail } from "../../i18n/shareText";
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
  const { t } = useTranslation();
  if (!shareRefusal) return null;
  const geography = shareRefusal.field === "geography";
  const detail = shareRefusalDetail(t, shareRefusal.detail);
  return (
    <aside aria-label={t("share.refusalAria")} className="share-refusal">
      <span className="eyebrow">{t("share.refusalEyebrow")}</span>
      <p>
        {geography
          ? t("share.refusalGeography", { detail })
          : t("share.refusalUnreadable", { field: shareRefusal.field, detail })}
      </p>
    </aside>
  );
}
