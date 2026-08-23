/**
 * The link that hands a plan to a colleague.
 *
 * It is shown in full, not hidden behind a button, because a coordinator
 * pasting a link into an email should be able to read what they are sending.
 * Every parameter in it is a number they set or an area they chose; the
 * allowlist in `planShareState.ts` is what makes that claim checkable rather
 * than a promise.
 */

import { useState } from "react";

import { useShell } from "../shell/ShellContext";
import { useTranslation } from "../../i18n/context";
import "../export/handoff.css";

export function ShareLink() {
  const { planReady, shareUrl } = useShell();
  const { t } = useTranslation();
  const [status, setStatus] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus(t("link.copied"));
    } catch {
      setStatus(t("link.copyFailed"));
    }
  }

  return (
    <div className="handoff">
      <div>
        <span className="eyebrow">{t("link.eyebrow")}</span>
        <p>{t("link.lede")}</p>
      </div>
      <div className="handoff-actions">
        <button
          className="button button-quiet"
          disabled={!planReady || shareUrl === ""}
          onClick={copyLink}
          type="button"
        >
          {t("link.copy")}
        </button>
      </div>
      {shareUrl !== "" && (
        <div className="handoff-link">
          <span className="eyebrow">{t("link.readBeforeSending")}</span>
          <code>{shareUrl}</code>
        </div>
      )}
      {status && (
        <p className="handoff-status" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
