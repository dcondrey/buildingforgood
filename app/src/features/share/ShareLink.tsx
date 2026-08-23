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
import "../export/handoff.css";

export function ShareLink() {
  const { planReady, shareUrl } = useShell();
  const [status, setStatus] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus(
        "Link copied. Opening it rebuilds this plan exactly, with no account and no server.",
      );
    } catch {
      setStatus("Clipboard unavailable. Select the link below and copy it by hand.");
    }
  }

  return (
    <div className="handoff">
      <div>
        <span className="eyebrow">Send this plan</span>
        <p>
          The whole plan travels in the link: the hours you set, the guaranteed minimum, every human
          lock, and the two assumptions you stated. Nothing is stored anywhere, and the link carries
          neighborhood names and hour counts only — no records, no locations, nothing about any
          person.
        </p>
      </div>
      <div className="handoff-actions">
        <button
          className="button button-quiet"
          disabled={!planReady || shareUrl === ""}
          onClick={copyLink}
          type="button"
        >
          Copy link to this plan
        </button>
      </div>
      {shareUrl !== "" && (
        <div className="handoff-link">
          <span className="eyebrow">Read it before you send it</span>
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
