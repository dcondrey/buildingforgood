/**
 * Static accessibility guards: the things a stylesheet and a JSX tree can be
 * held to without a browser.
 *
 * `docs/project/ACCESSIBILITY.md` lists what is still owed to a person: Safari,
 * a real screen reader, a real print render, **400% zoom reflow (1.4.10)** and
 * **text spacing (1.4.12)**. The last two need real layout, and jsdom computes
 * none, so no test here can establish conformance with either.
 *
 * What a test can do is hold the line on their mechanical causes. Reflow breaks
 * when something is pinned wider than the 320 CSS pixels a 400% zoom leaves, or
 * when a long string refuses to wrap outside a scrollable region. Text spacing
 * breaks when a text container is a fixed height and clips, or when a rule
 * makes itself unoverridable. Those are visible in the stylesheet.
 *
 * So this is a regression gate, not a verification. The audit's "owed to a
 * person" list does not get shorter because this file exists, and it says so.
 *
 * Two more properties are held here because both are easy to lose by accident:
 * tab order and text selection.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SHEETS = ["App.css", "index.css", "print.css"] as const;

function css(name: string): string {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

/** Declarations with the selector they belong to, comments stripped. */
function rules(source: string): { selector: string; body: string }[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: { selector: string; body: string }[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(withoutComments)) !== null) {
    out.push({ selector: match[1].trim().replace(/\s+/g, " "), body: match[2] });
  }
  return out;
}

/**
 * `white-space: nowrap` is legitimate on content that is short by construction
 * and wrong on prose. Each entry states which it is, so adding one is a
 * decision rather than a default.
 */
const NOWRAP_ALLOWED: Record<string, string> = {
  ".sr-only": "the visually-hidden utility; nowrap is part of the standard pattern",
  ".plan-state": "a status chip",
  ".confidence-chip": "a one-word chip",
  ".selected-chip": "a one-word chip",
  ".wide-warning": "a status chip, not the warning prose it sits beside",
  ".review-status": "a status chip",
  ".distribution-heading > span": "a heading fragment",
  ".formula": "a short arithmetic string; breaking mid-expression is worse than not wrapping",
  ".area-cell span": "an area name, bounded by the geography",
  ".area-name span": "an area name, bounded by the geography",
  ".challenge-badge": "a badge",
  ".bias-diagnostic > summary > strong": "a summary label, with the prose in a sibling",
  ".diagnostic-only": "a short marker",
  ".constraint-chip": "a two or three word chip",
  ".compare-delta": "a signed number",
  ".scorecard-table th": "a table cell inside an overflow-x region",
  ".scorecard-table td": "a table cell inside an overflow-x region",
  ".data-table-disclosure th": "a table cell inside an overflow-x region",
  ".data-table-disclosure td": "a table cell inside an overflow-x region",
  ".ws-body .plan-toolbar .button": "a button label",
};

/**
 * Rules where a fixed height with hidden overflow is correct rather than a
 * clipping hazard. Both are deliberate and neither contains prose.
 */
const CLIP_ALLOWED: Record<string, string> = {
  ".sr-only": "the visually-hidden utility is a 1px box on purpose",
  ".guide-progress": "a progress bar; its height is the bar, and it holds no text",
};

describe("reflow at 320 CSS pixels (WCAG 1.4.10), by its mechanical causes", () => {
  it("pins nothing wider than the viewport a 400% zoom leaves", () => {
    const offenders: string[] = [];
    for (const sheet of SHEETS) {
      for (const rule of rules(css(sheet))) {
        for (const [, value] of rule.body.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) {
          if (Number(value) > 320) offenders.push(`${sheet}: ${rule.selector} width:${value}px`);
        }
      }
    }
    expect(offenders, "a fixed width past 320px forces a horizontal scrollbar").toEqual([]);
  });

  it("refuses to wrap only where the content is short by construction", () => {
    const undeclared: string[] = [];
    for (const sheet of SHEETS) {
      for (const rule of rules(css(sheet))) {
        if (!/white-space:\s*nowrap/.test(rule.body)) continue;
        for (const selector of rule.selector.split(",").map((s) => s.trim())) {
          if (!(selector in NOWRAP_ALLOWED)) undeclared.push(`${sheet}: ${selector}`);
        }
      }
    }
    expect(
      undeclared,
      "nowrap on prose breaks reflow; add the selector to NOWRAP_ALLOWED with why it is short",
    ).toEqual([]);
  });
});

describe("text spacing overrides (WCAG 1.4.12), by its mechanical causes", () => {
  it("never clips text by pinning a container's height", () => {
    // The failure this prevents: a user applies the criterion's line-height and
    // the text grows past a fixed height that hides its overflow.
    const offenders: string[] = [];
    for (const sheet of SHEETS) {
      for (const rule of rules(css(sheet))) {
        const fixedHeight = /(?:^|[^-\w])height:\s*\d+px/.test(rule.body);
        const clips = /overflow(?:-y)?:\s*hidden/.test(rule.body);
        if (!fixedHeight || !clips) continue;
        const selectors = rule.selector.split(",").map((one) => one.trim());
        if (selectors.every((one) => one in CLIP_ALLOWED)) continue;
        offenders.push(`${sheet}: ${rule.selector}`);
      }
    }
    expect(offenders, "a fixed height that hides overflow clips respaced text").toEqual([]);
  });

  it("leaves spacing properties overridable", () => {
    const offenders: string[] = [];
    for (const sheet of SHEETS) {
      for (const rule of rules(css(sheet))) {
        for (const [declaration] of rule.body.matchAll(
          /(?:line-height|letter-spacing|word-spacing)[^;]*!important/g,
        )) {
          offenders.push(`${sheet}: ${rule.selector} — ${declaration.trim()}`);
        }
      }
    }
    expect(
      offenders,
      "!important on a spacing property defeats the user stylesheet the criterion assumes",
    ).toEqual([]);
  });
});

describe("what these tests do not establish", () => {
  it("records that the audit's owed list is unchanged by any of this", () => {
    // Stated as an assertion so it is read rather than skimmed: the document
    // that owes the work is the one that must keep saying so.
    const audit = readFileSync(
      new URL("../../docs/project/ACCESSIBILITY.md", import.meta.url),
      "utf8",
    );
    expect(audit).toMatch(/still owed to a person/i);
    for (const owed of ["Safari", "screen reader", "print render", "reflow", "text spacing"]) {
      expect(audit.toLowerCase()).toContain(owed.toLowerCase());
    }
  });
});

/** Every .tsx under src, so a new component cannot dodge these rules. */
function components(dir = new URL("./", import.meta.url)): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const child = new URL(entry + (entry.includes(".") ? "" : "/"), dir);
    if (statSync(child).isDirectory()) out.push(...components(child));
    else if (entry.endsWith(".tsx") && !entry.includes(".test."))
      out.push(readFileSync(child, "utf8"));
  }
  return out;
}

describe("tab order", () => {
  it("comes from document order, never from a positive tabindex", () => {
    // A positive tabindex builds a second, parallel tab order that overrides
    // the document's. It is the usual way "logical tab order" is attempted and
    // the usual way it breaks: one positive value anywhere pulls that element
    // ahead of every natural control on the page, and the next person to add
    // markup has no way to know.
    const offenders = components().flatMap((source) =>
      [...source.matchAll(/tabIndex=\{?\s*["']?([0-9]+)/g)]
        .filter((m) => Number(m[1]) > 0)
        .map((m) => m[0]),
    );
    expect(offenders, "use 0 to make something focusable and -1 to focus it in code").toEqual([]);
  });

  it("makes scroll regions reachable, which is what tabindex zero is for", () => {
    // A-2 in the audit: a scrollable region that only a mouse could scroll.
    const withScrollRegion = components().filter((s) => s.includes('role="region"'));
    expect(withScrollRegion.length).toBeGreaterThan(0);
    for (const source of withScrollRegion) {
      for (const [region] of source.matchAll(/<div[^>]*role="region"[^>]*>/g)) {
        expect(region, "a focusable region needs a name and a tab stop").toMatch(/tabIndex=\{0\}/);
        expect(region).toMatch(/aria-label/);
      }
    }
  });
});

describe("text selection", () => {
  it("is blocked only on chrome, never on a number somebody has to quote", () => {
    // An operator reading a figure into a board paper selects it and copies it.
    // `user-select: none` belongs on buttons, tabs and decorative counters, and
    // nowhere near a value. Extending the list is a decision, not a default.
    const CHROME = new Set([
      ".plan-state",
      ".button",
      ".floor-option",
      ".chain-node",
      ".section-number",
      ".brand-mark",
      ".guide-step-count",
      ".guide-progress",
      ".guide-actions",
      ".area-map svg",
      ".area-map-svg",
      "summary",
      ".view-toggle button",
      ".ws-layers button",
      ".ws-tabs button",
      ".scenario-list li button",
    ]);
    const offenders: string[] = [];
    for (const sheet of SHEETS) {
      for (const rule of rules(css(sheet))) {
        if (!/user-select:\s*none/.test(rule.body)) continue;
        for (const selector of rule.selector.split(",").map((s) => s.trim())) {
          if (selector && !CHROME.has(selector)) offenders.push(`${sheet}: ${selector}`);
        }
      }
    }
    expect(
      offenders,
      "if this is data, leave it selectable; if it is chrome, add it above",
    ).toEqual([]);
  });
});
