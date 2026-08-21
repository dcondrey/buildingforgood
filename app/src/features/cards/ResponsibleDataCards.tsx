/**
 * Responsible-data cards (issue #16).
 *
 * The card TEXT is agreed in docs/track-c/C-05-responsible-data-cards.md;
 * this renders it. Wiring into the shell waits on #13, so the component
 * takes everything it states as props rather than reaching for globals, and
 * refuses to invent a value it was not given.
 *
 * One rule drives the structure: a card sits adjacent to the result it
 * describes, never behind a help link. A limitation reachable only by
 * clicking is a limitation nobody reads (C-01 finding R-04). `variant`
 * therefore defaults to inline; `disclosure` exists only for the long
 * reference cards a coordinator consults rather than reads every time.
 */

import { useId, useState } from "react";

export type CardVariant = "inline" | "disclosure";

export interface ResponsibleDataCardProps {
  title: string;
  /** One-line summary. Always visible, in both variants. */
  summary: string;
  /** Body lines. Rendered as a list so a screen reader can navigate them. */
  points: string[];
  variant?: CardVariant;
  /** Rendered last, in the same block, never behind a separate control. */
  caveat?: string;
}

export function ResponsibleDataCard({
  title,
  summary,
  points,
  variant = "inline",
  caveat,
}: ResponsibleDataCardProps) {
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const expanded = variant === "inline" || open;

  return (
    <section aria-labelledby={headingId} data-variant={variant}>
      <h3 id={headingId}>{title}</h3>
      <p>{summary}</p>

      {variant === "disclosure" && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "Hide details" : "Show details"} for {title}
        </button>
      )}

      {expanded && (
        <>
          <ul>
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          {caveat && (
            <p>
              <strong>Note.</strong> {caveat}
            </p>
          )}
        </>
      )}
    </section>
  );
}

export interface SuppressionNoticeProps {
  /** How many published cells were withheld. */
  suppressedCells: number;
  /** How many whole rows were withheld. */
  suppressedRows: number;
  threshold: number;
}

/**
 * Suppression has to be visible as a data-quality state (C-01 finding R-06).
 * A withheld cell and a true zero mean very different things to a
 * coordinator, and rendering the first as the second is the failure this
 * whole thread of work exists to prevent.
 */
export function SuppressionNotice({
  suppressedCells,
  suppressedRows,
  threshold,
}: SuppressionNoticeProps) {
  return (
    <p role="note">
      <strong>◇ Some counts are withheld.</strong> {suppressedCells} values and {suppressedRows}{" "}
      whole months are withheld because they fall below {threshold}. A withheld count is not zero.
      It means too few people were observed to publish the number without identifying someone.
    </p>
  );
}

export interface AiDisclosureProps {
  /** Anything a generative model did touch, so the claim stays true. */
  generativeUses?: string[];
}

export function AiDisclosure({ generativeUses = [] }: AiDisclosureProps) {
  return (
    <section aria-labelledby="ai-disclosure-heading">
      <h3 id="ai-disclosure-heading">How this was produced</h3>
      <p>
        No generative model determines the evidence result, the forecast, or the allocation. All
        three are deterministic rules, and the same inputs produce the same output every run.
      </p>
      {generativeUses.length > 0 && (
        <>
          <p>A generative model was used for the following, each reviewed by a person:</p>
          <ul>
            {generativeUses.map((use) => (
              <li key={use}>{use}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
