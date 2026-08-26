/**
 * The palette meets WCAG 2.1 AA, measured rather than asserted.
 *
 * This test exists because the independent audit's A-6 finding — `--faint`
 * below 4.5:1 on two panel surfaces — was invisible to axe. jsdom does not
 * resolve CSS custom properties through a stylesheet, so axe's colour-contrast
 * rule is inert in this suite and the passing axe runs are not contrast
 * coverage. The fix lightened one token, and the closest surviving pair clears
 * the threshold by 0.05, which is inside the rounding error of a future
 * palette tweak. A token nudged a shade darker would fail AA silently in the
 * product and green in CI.
 *
 * So the tokens are read out of `index.css` and the ratios recomputed here.
 * Adding a text colour or a surface adds a pair; the pair is checked or the
 * test names it as unclassified.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const CSS = readFileSync(fileURLToPath(new URL("./index.css", import.meta.url)), "utf8");

/** Opaque hex tokens only. Alpha tokens compose over an unknown backdrop and
 *  are checked at their composited sites, not here. */
function tokens(): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of CSS.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    found.set(`--${match[1]}`, match[2].toLowerCase());
  }
  return found;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Every surface a body-text token can land on. */
const SURFACES = ["--bg", "--bg-raised", "--panel-solid", "--panel-soft"];

/** Tokens used as `color:` on those surfaces. */
const TEXT = [
  "--ink",
  "--ink-soft",
  "--muted",
  "--faint",
  "--amber",
  "--amber-bright",
  "--teal",
  "--teal-bright",
  "--green",
  "--red",
];

/**
 * Selected text is text, and it was the one pair nobody had measured.
 *
 * The rule sets a foreground as well as a background, which is what makes it
 * checkable at all: a `::selection` that sets only a background inherits
 * whatever colour the underlying text had, so the same highlight can be
 * comfortable over body copy and unreadable over a dim token. Fixing both ends
 * means one pair to verify instead of one per text colour.
 */
describe("the selection highlight is legible, and visible against the page", () => {
  const selection = /::selection\s*\{([^}]*)\}/.exec(
    readFileSync(fileURLToPath(new URL("./index.css", import.meta.url)), "utf8"),
  );

  it("sets both ends of the pair rather than only a background", () => {
    expect(selection, "no ::selection rule; the browser default is unknowable").not.toBeNull();
    expect(selection?.[1]).toMatch(/background:/);
    expect(selection?.[1], "a background alone inherits the underlying text colour").toMatch(
      /(^|[^-])color:/,
    );
  });

  it("clears AA for selected text, and does so with room", () => {
    const palette = tokens();
    const background = palette.get("--amber");
    const foreground = /(?:^|[^-])color:\s*(#[0-9a-fA-F]{6})/.exec(selection?.[1] ?? "")?.[1];
    expect(background, "::selection uses --amber as its background").toBeDefined();
    expect(foreground, "::selection sets a literal hex foreground").toBeDefined();
    // 9.63:1 as measured. The threshold is AA's 4.5, and the margin is the
    // point: a highlight that only just clears is one palette nudge from not.
    expect(contrastRatio(foreground as string, background as string)).toBeGreaterThanOrEqual(4.5);
  });

  it("stands out from every surface it can be drawn over", () => {
    // A highlight the same luminance as the page is invisible even when the
    // text inside it is perfectly legible.
    const palette = tokens();
    const highlight = palette.get("--amber") as string;
    for (const surface of SURFACES) {
      const bg = palette.get(surface);
      if (!bg) continue;
      expect(contrastRatio(highlight, bg), `selection is invisible on ${surface}`).toBeGreaterThan(
        3,
      );
    }
  });
});

describe("the palette clears WCAG 2.1 AA on every text-on-surface pair", () => {
  const palette = tokens();

  it.each(TEXT.flatMap((text) => SURFACES.map((surface) => [text, surface] as const)))(
    "%s on %s is at least 4.5:1",
    (text, surface) => {
      const fg = palette.get(text);
      const bg = palette.get(surface);
      expect(fg, `${text} is not an opaque hex token in index.css`).toBeDefined();
      expect(bg, `${surface} is not an opaque hex token in index.css`).toBeDefined();
      expect(contrastRatio(fg as string, bg as string)).toBeGreaterThanOrEqual(4.5);
    },
  );

  /**
   * The list above is hand-maintained, so a token added to `index.css` and used
   * as text would not be checked by it. This fails when that happens, naming
   * the token, rather than letting the omission pass as coverage.
   */
  it("classifies every opaque colour token as text, surface, or neither", () => {
    const classified = new Set([...TEXT, ...SURFACES]);
    // Tokens that are opaque hex but are neither text nor a surface.
    const known = new Set(["--amber-dim", "--teal-dim", "--green-dim", "--red-dim"]);
    const unclassified = [...tokens().keys()].filter(
      (name) => !classified.has(name) && !known.has(name),
    );
    expect(unclassified).toEqual([]);
  });
});
