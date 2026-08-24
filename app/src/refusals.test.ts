/**
 * The refusal suite: the things this product must never do, asserted against
 * the code that actually ships.
 *
 * Every check here exists because the refusal it defends was, until Phase 1,
 * upheld by one author's discipline. The enumerated refusals come from
 * README.md ("What it will not say"), the C-01 red-team review (R-02, R-03,
 * R-04, R-09, R-11), and config/decision.v1.json
 * (`observations.complaint_volume_excluded_uses`).
 *
 * Two design rules kept this suite honest:
 *
 * 1. **Semantics, not sentences.** A test that greps for the four literal
 *    README sentences is worthless: nobody types them verbatim. The copy
 *    scan below matches the *shape* of each forbidden claim — a person-level
 *    movement verb, a causal verb, enforcement framing, a capacity or
 *    eligibility statement — over every string the app can emit.
 * 2. **The disclaimer is not the claim.** This product deliberately names
 *    what it refuses ("Never authorized: person tracking, causal claims,
 *    enforcement..."). A match inside a negated statement is allowed; a
 *    match standing on its own is not.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertNoComplaintSignal, buildPlan, PlannerInputError } from "./domain/planner/planner.ts";
import { assertNoPersonDenominator } from "./domain/cost/cost.ts";
import { AREA_PLANNING_INPUT_EXCLUDES_COMPLAINT_SIGNAL } from "./domain/planner/types.ts";
import type { AreaPlanningInput, PlannerPolicy } from "./domain/planner/types.ts";
import { CATALOGUES } from "./i18n/translate.ts";
import { LOCALES, type Locale } from "./i18n/locale.ts";
import { adaptDemoV1, EMBEDDED_DEMO, PLANNING_AREA_EXCLUDES_COMPLAINT_SIGNAL } from "./lib/demo.ts";
import type { PlanningArea } from "./lib/demo.ts";
import { applyIntervention } from "./lib/intervention.ts";
import { allocateHours } from "./lib/planner.ts";
import {
  foldForMatch,
  LOCALE_VOCABULARY,
  PERMITTED_CORPUS,
  REFUSED_CORPUS,
  UNSHIPPED_CONNECTORS,
  type VocabularyLocale,
} from "./domain/vocabulary/refusedTerms.ts";
import { assertShareable } from "./features/share/planShareState.ts";

const SRC = dirname(fileURLToPath(import.meta.url));

/** A minimal shareable plan whose single lock names `areaId`. */
function shareStateWithArea(areaId: string) {
  return assertShareable({
    budget: 80,
    floor: 8,
    guard: true,
    locks: [[areaId, 8]],
    share: 0.5,
    assume: null,
    rate: 45,
    geography: "dsdp-core-six/2026-08-21",
  });
}
const REPO = resolve(SRC, "../..");
const ARTIFACT = JSON.parse(
  readFileSync(join(REPO, "public/generated/demo.v1.json"), "utf8"),
) as Record<string, unknown>;

/* ------------------------------------------------------------------ *
 * Source corpus
 * ------------------------------------------------------------------ */

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      sourceFiles(path, acc);
      continue;
    }
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
    acc.push(path);
  }
  return acc;
}

const SOURCE_FILES = sourceFiles(SRC).sort();

function resolveImport(fromDir: string, specifier: string): string | null {
  const base = resolve(fromDir, specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // not this candidate
    }
  }
  return null;
}

/**
 * Modules reachable from `main.tsx` by a value import — that is, the modules
 * that survive into the bundle. Type-only imports are stripped first, because
 * they are erased at build time and prove nothing about what runs.
 */
const RUNTIME_REACHABLE: string[] = (() => {
  const seen = new Set<string>();
  const queue = [join(SRC, "main.tsx")];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    let source: string;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const values = source.replace(/\bimport\s+type\s[^;]*?;/g, " ");
    for (const match of values.matchAll(/\bfrom\s+"([^"]+)"/g)) {
      const specifier = match[1] ?? "";
      if (!specifier.startsWith(".")) continue;
      const resolved = resolveImport(dirname(file), specifier);
      if (resolved) queue.push(resolved);
    }
  }
  return [...seen].map((file) => file.slice(SRC.length + 1)).sort();
})();

/**
 * Split a source file into code and the copy it can emit.
 *
 * Hand-rolled rather than parsed, because the only two things this needs to
 * tell apart are "text a person could read on screen" and "everything else",
 * and a scanner that fails closed on ambiguity is easier to trust than a
 * parser dependency. `copy` collects string literals, template literals, and
 * JSX text; `code` is what is left once literals, comments, and regular
 * expressions are removed.
 */
function partition(source: string): { copy: string[]; code: string } {
  const copy: string[] = [];
  const code: string[] = [];
  const n = source.length;
  let i = 0;

  const pushJsx = (raw: string): void => {
    let text = raw;
    for (let pass = 0; pass < 4; pass += 1) text = text.replace(/\{[^{}]*\}/g, " ");
    // Entities carry a semicolon; blank them before the code-shape test so
    // `person&apos;s service need` is not mistaken for a statement.
    text = text.replace(/&[a-zA-Z]+;|&#x?[0-9a-fA-F]+;/g, "\u0000");
    if (/[;={}`'"]|&&|\|\|/.test(text)) return;
    if (!/[A-Za-z]{2}/.test(text)) return;
    const cleaned = text.replaceAll("\u0000", "'").replace(/\s+/g, " ").trim();
    if (cleaned) copy.push(cleaned);
  };

  const readString = (quote: string): string => {
    let buf = "";
    i += 1;
    while (i < n) {
      const c = source[i];
      if (c === "\\") {
        buf += source[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (c === quote) {
        i += 1;
        break;
      }
      buf += c;
      i += 1;
    }
    return buf;
  };

  const readTemplate = (): string => {
    let buf = "";
    i += 1;
    while (i < n) {
      const c = source[i];
      if (c === "\\") {
        buf += source[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (c === "`") {
        i += 1;
        break;
      }
      if (c === "$" && source[i + 1] === "{") {
        i += 2;
        let depth = 1;
        while (i < n && depth > 0) {
          const d = source[i];
          if (d === "{") depth += 1;
          else if (d === "}") depth -= 1;
          else if (d === "`") {
            copy.push(readTemplate());
            continue;
          } else if (d === "'" || d === '"') {
            copy.push(readString(d));
            continue;
          }
          i += 1;
        }
        buf += " ";
        continue;
      }
      buf += c;
      i += 1;
    }
    return buf;
  };

  // A `/` opens a regular expression only where a value may begin. `<` and
  // `>` are deliberately absent: in a .tsx file `</` closes a JSX tag.
  const regexCanStart = (): boolean => {
    let tail = "";
    for (let k = code.length - 1; k >= 0 && tail.length < 12; k -= 1) tail = (code[k] ?? "") + tail;
    tail = tail.replace(/\s+$/, "");
    return tail === "" || /[=(,:!&|?{};[+\-*%~^]$|\breturn$|\bcase$|\btypeof$/.test(tail);
  };

  while (i < n) {
    const c = source[i] ?? "";
    if (c === "/" && source[i + 1] === "/") {
      while (i < n && source[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"') {
      copy.push(readString(c));
      code.push(" ");
      continue;
    }
    if (c === "`") {
      copy.push(readTemplate());
      code.push(" ");
      continue;
    }
    if (c === "/" && regexCanStart()) {
      i += 1;
      while (i < n && source[i] !== "/") {
        if (source[i] === "\\") i += 1;
        if (source[i] === "\n") break;
        i += 1;
      }
      i += 1;
      while (i < n && /[dgimsuvy]/.test(source[i] ?? "")) i += 1;
      code.push(" ");
      continue;
    }
    if (c === ">") {
      let j = i + 1;
      while (j < n && source[j] !== "<") j += 1;
      pushJsx(source.slice(i + 1, j));
    }
    code.push(c);
    i += 1;
  }

  return { copy: copy.filter((text) => /[A-Za-z]/.test(text)), code: code.join("") };
}

interface Chunk {
  where: string;
  text: string;
  /** The copy immediately preceding it, so a label can disclaim its list. */
  context: string;
}

function collectStrings(value: unknown, into: string[]): void {
  if (typeof value === "string") {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into);
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) collectStrings(item, into);
  }
}

function plannerCopy(): string[] {
  const areas = EMBEDDED_DEMO.areas;
  const out: string[] = [];
  for (const budget of [0, 47, 48, 80, 400]) {
    for (const guard of [true, false]) {
      out.push(allocateHours(areas, budget, 8, guard).message);
    }
  }
  const policy: PlannerPolicy = {
    budget_hours: 80,
    time_increment_hours: 1,
    minimum_coverage_floor_hours: 8,
    continuity_reserve_hours: 4,
    uncertainty_weight: 0.5,
  };
  for (const budget of [8, 80]) {
    const plan = buildPlan(domainAreas(), { ...policy, budget_hours: budget });
    collectStrings(
      plan.allocations.map((a) => a.reasons),
      out,
    );
    collectStrings(plan.constraint_notes, out);
    collectStrings(plan.infeasible_reasons, out);
  }
  return out;
}

function domainAreas(): AreaPlanningInput[] {
  return EMBEDDED_DEMO.areas.map((area, index) => ({
    area_id: area.id,
    label: area.name,
    forecast_upper: area.planningLoad,
    forecast_lower: Math.max(0, area.planningLoad - 10),
    drop_test: index === 0 ? "possible_displacement" : "insufficient_evidence",
    included: true,
  }));
}

/** Every string a user could see, in the order the source produces it. */
const CORPUS: Chunk[] = (() => {
  const chunks: Chunk[] = [];
  for (const file of SOURCE_FILES) {
    const where = file.slice(SRC.length + 1);
    let previous = "";
    for (const text of partition(readFileSync(file, "utf8")).copy) {
      chunks.push({ where, text, context: previous });
      previous = text;
    }
  }
  const artifactStrings: string[] = [];
  collectStrings(adaptDemoV1(ARTIFACT), artifactStrings);
  for (const text of artifactStrings) {
    chunks.push({ where: "generated/demo.v1.json", text, context: "" });
  }
  for (const text of plannerCopy()) {
    chunks.push({ where: "planner output", text, context: "" });
  }
  return chunks;
})();

/**
 * Negation cues, in every language this product speaks. A forbidden shape is
 * permitted only inside a statement that denies, excludes, or forbids it —
 * which is how this product talks about its own boundaries.
 */
const NEGATED_EN =
  /\b(?:no|not|never|nor|none|nothing|neither|cannot|can'?t|does\s+not|doesn'?t|do\s+not|don'?t|must\s+not|may\s+never|will\s+not|won'?t|is\s+not|are\s+not|without|exclude[sd]?|excluding|exclusions?|excluded_uses|not_in_scope|forbidden|unauthorized|refuses?|refused|refusals?|prohibits?|prohibited|rather\s+than|instead\s+of|non-goal|out\s+of\s+scope|limitations?)\b/i;

const NEGATED_ES =
  /\b(?:no|ni|nunca|jam[aá]s|sin|ning[uú]n|ninguno|ninguna|ningunos|ningunas|nada|nadie|tampoco|excluid[oa]s?|excluid[oa]|excluye[n]?|excluir|exclusi[oó]n|exclusiones|fuera\s+de\s+objetivo|fuera\s+del\s+alcance|proh[ií]be[n]?|prohibid[oa]s?|rechaz[ao][ns]?|rechazad[oa]s?|se\s+niega|en\s+lugar\s+de|limitaci[oó]n|limitaciones|no\s+autoriza|no\s+es|no\s+son|no\s+puede[n]?|salvo)\b/i;

const NEGATED = new RegExp(`${NEGATED_EN.source}|${NEGATED_ES.source}`, "i");

interface Refusal {
  /** The README sentence this defends. */
  refusal: string;
  patterns: RegExp[];
}

/**
 * The Spanish rules for the same four refusals.
 *
 * These exist because the English patterns are worthless against Spanish
 * copy: nothing in `i18n/es.ts` contains the word "enforcement", so a
 * catalogue that told a coordinator an area *necesita desalojo* would have
 * passed the suite in silence. The refusals are a property of the product,
 * not of one language, and they are only defended in the languages the
 * scanner actually reads.
 */
const REFUSALS_ES: Refusal[] = [
  {
    refusal: "These people moved from one block or neighborhood to another.",
    patterns: [
      /\b(?:personas?|gente|individuos?|residentes?|ocupantes?|ellos|ellas|alguien)\b[^.]{0,60}?\b(?:se\s+(?:mudaron|mudó|trasladaron|trasladó|movieron|movió|desplazaron|desplazó|fueron)|acabaron\s+en|terminaron\s+en|fueron\s+desplazad\w+)\b/i,
      /\b(?:se\s+mud\w+|se\s+traslad\w+|se\s+desplaz\w+)\b[^.]{0,40}?\bde\b[^.]{0,40}?\b(?:cuadra|barrio|área|area|zona)\b[^.]{0,40}?\ba\b/i,
      /\bqui[eé]n\s+se\s+(?:mueve|mueven|muda|mudan|traslada|trasladan|movi[oó]|mud[oó]|traslad[oó])\s+a\s+d[oó]nde\b/i,
      /\b(?:rastrea|rastrear|rastreo|sigue\s+la\s+pista|seguimiento)\b[^.]{0,30}\b(?:personas?|individuos?|gente)\b/i,
    ],
  },
  {
    refusal: "A policy caused the decline.",
    patterns: [
      /\b(?:caus[oó]|causaron|causa|causan|provoc[oó]|provocaron|origin[oó]|debido\s+a|a\s+causa\s+de|gracias\s+a|dio\s+lugar\s+a|result[oó]\s+en|se\s+debe\s+a)\b/i,
      /\b(?:pol[ií]tica|ordenanza|desalojo|desalojos|programa|intervenci[oó]n|operativo)\w*\b[^.]{0,60}?\b(?:funcion[oó]|redujo|bajó|disminuy[oó]|explica|caus[oó])\b/i,
      /\b(?:demuestra\s+que|prueba\s+que|confirma\s+que|comprueba\s+que)\b/i,
    ],
  },
  {
    refusal: "This area needs enforcement.",
    patterns: [
      /\baplicaci[oó]n\s+de\s+la\s+ley\b/i,
      /\bdesalojos?\b/i,
      /\bredadas?\b|\bbarridas?\b|\boperativos?\s+de\s+limpieza\b/i,
      /\b(?:lista|orden|ranking)\s+de\s+(?:prioridad|prioridades|objetivos)\b/i,
      /\bnecesita[n]?\s+(?:desalojo|polic[ií]a|vigilancia|limpieza|remoci[oó]n)\b/i,
      /\bzonas?\s+calientes?\b|\bpuntos?\s+calientes?\b/i,
    ],
  },
  {
    refusal: "A shelter has capacity or someone is eligible for a service.",
    patterns: [
      /\bcapacidad\s+(?:de|del|en)\s+(?:refugio|refugios|albergue|albergues|servicio|servicios)\b/i,
      /\bcamas\b[^.]{0,30}\b(?:disponibles?|libres?|esta\s+noche|restantes?)\b/i,
      /\belegib\w+\b/i,
      /\bcalifica[n]?\s+para\b|\bcalificad[oa]s?\s+para\b/i,
      /\b(?:cupos?|espacios?|vacantes?)\s+(?:disponibles?|de\s+servicio)\b/i,
      /\bdisponibilidad\s+en\s+tiempo\s+real\b/i,
    ],
  },
  {
    refusal: "Complaint volume is need, demand, or a reason to go somewhere.",
    patterns: [
      /\bordenad[oa]s?\s+por\s+(?:quejas|denuncias|311|reportes)\b/i,
      /\b(?:quejas|denuncias|311|molestias|reportes?)\b[^.]{0,70}?\b(?:necesidad|demanda|gravedad|prioridad|ranking|clasifica\w*|peor|zona\s+caliente)\b/i,
      /\b(?:d[oó]nde|[aá]reas?)\b[^.]{0,40}?\b(?:la\s+gente\s+est[aá]\s+molesta|m[aá]s\s+quejas|m[aá]s\s+denuncias)\b/i,
    ],
  },
];

const REFUSALS: Refusal[] = [
  {
    refusal: "These people moved from one block or neighborhood to another.",
    patterns: [
      /\b(?:people|persons?|individuals?|residents?|they|folks|someone|campers?)\b[^.]{0,60}?\b(?:moved|relocated|migrated|dispersed|ended up|were displaced|went to)\b/i,
      /\b(?:moved|relocated|shifted|dispersed|displaced)\b[^.]{0,40}?\bfrom\b[^.]{0,40}?\b(?:block|neighborhood|area)\b[^.]{0,40}?\bto\b/i,
      /\bwho moved where\b/i,
      /\b(?:tracks?|tracking|traces?|traced)\b[^.]{0,30}\b(?:individuals?|people|persons?)\b/i,
    ],
  },
  {
    refusal: "A policy caused the decline.",
    patterns: [
      /\b(?:caused|causes|causing|resulted in|led to|brought about|responsible for|because of|due to)\b/i,
      /\b(?:polic(?:y|ies)|ordinance|enforcement|outreach|program|intervention|sweeps?)\b[^.]{0,60}?\b(?:worked|reduced|cut|lowered|drove down|explains?|caused)\b/i,
      /\b(?:proves|proven|confirms|demonstrates that|shows that)\b/i,
    ],
  },
  {
    refusal: "This area needs enforcement.",
    patterns: [
      /\benforcement\b/i,
      /\babatements?\b/i,
      /\bcrack ?downs?\b|\bhot ?spots?\b/i,
      /(?<!street[- ])\bsweeps?\b/i,
      /\b(?:priority|target|watch)\s+(?:list|rank|ranking|order)\b/i,
      /\bneeds?\s+(?:enforcement|policing|cleanup|clearing|removal)\b/i,
    ],
  },
  {
    refusal: "A shelter has capacity or someone is eligible for a service.",
    patterns: [
      /\bshelters?\s+(?:capacity|beds?|space|availability|openings?|vacanc\w*)\b/i,
      /\bavailable beds?\b|\bbeds?\b[^.]{0,30}\b(?:available|open|free|tonight|remaining)\b/i,
      /\beligib\w+\b/i,
      /\b(?:qualifies|qualify|qualified)\s+for\b/i,
      /\bservice\s+(?:capacity|availability|slots?|openings?)\b/i,
      /\breal[- ]time\s+(?:status|availability|capacity)\b/i,
    ],
  },
  {
    // Not a README sentence, but the same refusal one layer down: C-01 §4
    // bars describing complaint volume as need, demand, or severity, and
    // R-03 names "sort by complaints" as the request most likely to break
    // the product. Copy is where that arrives before code does.
    refusal: "Complaint volume is need, demand, or a reason to go somewhere.",
    patterns: [
      /\bsort(?:ed|ing)?\s+by\s+(?:complaints?|311|reports?)\b/i,
      /\b(?:complaints?|311|nuisance)\b[^.]{0,40}?\b(?:need|demand|severity|priority|rank(?:ed|ing)?|worst|hotspot)\b/i,
      /\b(?:where|areas?)\b[^.]{0,40}?\b(?:people are upset|residents complain|most complaints)\b/i,
    ],
  },
];

interface Violation {
  where: string;
  refusal: string;
  matched: string;
  text: string;
}

/**
 * Every rule set, applied to every chunk. A Spanish pattern cannot match
 * English prose and vice versa, so running both over everything costs nothing
 * and closes the gap where a translated string is scanned by the rules of the
 * language it is no longer written in.
 */
const ALL_REFUSALS: Refusal[] = [...REFUSALS, ...REFUSALS_ES];

function scan(chunks: Chunk[], rules: Refusal[] = ALL_REFUSALS): Violation[] {
  const violations: Violation[] = [];
  for (const chunk of chunks) {
    for (const { refusal, patterns } of rules) {
      for (const pattern of patterns) {
        const match = pattern.exec(chunk.text);
        if (!match) continue;
        const statement = `${chunk.context} ${chunk.text.slice(0, match.index + match[0].length)}`;
        if (NEGATED.test(statement)) continue;
        violations.push({
          where: chunk.where,
          refusal,
          matched: match[0],
          text: chunk.text.slice(0, 160),
        });
      }
    }
  }
  return violations;
}

/* ------------------------------------------------------------------ *
 * 1. A complaint-shaped field is refused, and planning load must reconcile
 *    with the derivation it declares
 *
 * Read the boundary before the assertions. The claim these tests support is
 * the narrow one recorded in `docs/project/DECISIONS.md`:
 *
 *   Complaint volume cannot reach allocation without also corrupting the
 *   published forecast interval, which is derived from checksummed inputs.
 *
 * NOT "complaint volume cannot influence planning." That wider claim was
 * tested, falsified, and withdrawn: 311 counts written into `planning_load`
 * are a legally named, correctly typed, schema-legal number, and every guard
 * below the derivation check matches field *names*, which a number does not
 * have. An independent review executed it and re-ranked the shipped plan
 * (`docs/project/PHASE1_ADVERSARIAL.md`, and finding F-7 in
 * `docs/project/PHASE0_FINDINGS.md`).
 *
 * What holds the line is the arithmetic: attacks C and D below, and the
 * `planning_load` derivation check in
 * `pipeline/src/stillhere_pipeline/contracts.py`, which recomputes a declared
 * derivation against a value already published elsewhere in the artifact.
 * ------------------------------------------------------------------ */

const COMPLAINT_SHAPES: Array<[string, Record<string, unknown>]> = [
  ["a top-level complaint count", { complaint_count: 42 }],
  ["a camelCase complaint weight", { complaintVolume: 42 }],
  ["a 311 field", { calls_311: 42 }],
  ["a service-request field", { service_request_rate: 42 }],
  ["a call-volume field", { call_volume: 42 }],
  ["a report-volume field", { report_volume: 42 }],
  ["a nested diagnostic", { diagnostics: { complaint_count: 42 } }],
  ["a nested array element", { history: [{ month: "2025-01", complaints: 3 }] }],
];

const POLICY: PlannerPolicy = {
  budget_hours: 80,
  time_increment_hours: 1,
  minimum_coverage_floor_hours: 8,
  continuity_reserve_hours: 4,
  uncertainty_weight: 0.5,
};

describe("refusal: a complaint-shaped field is refused, and planning load must reconcile with its declared derivation", () => {
  it("puts the guard on the path that actually ships", () => {
    // Finding F-1: the guarded planner was tree-shaken out of the bundle, so
    // the refusal held only over code no user could reach. Assert the
    // property that failure had — reachability from the real entry point —
    // rather than one import line, which a refactor moves.
    expect(RUNTIME_REACHABLE).toContain("lib/planner.ts");
    expect(RUNTIME_REACHABLE).toContain("domain/planner/planner.ts");

    const shipped = readFileSync(join(SRC, "lib/planner.ts"), "utf8");
    expect(shipped).toMatch(/assertNoComplaintSignal\(/);
    // A second copy of a safety check is how the weaker one wins.
    expect(shipped).not.toMatch(/function assertNoComplaintSignal/);
  });

  for (const [label, extra] of COMPLAINT_SHAPES) {
    it(`the shipped planner rejects ${label}`, () => {
      const areas = EMBEDDED_DEMO.areas.map((area) => ({ ...area, ...extra }) as PlanningArea);
      expect(() => allocateHours(areas, 80, 8, true)).toThrow(PlannerInputError);
    });

    it(`the domain planner rejects ${label}`, () => {
      const areas = domainAreas().map((area) => ({ ...area, ...extra }) as AreaPlanningInput);
      expect(() => buildPlan(areas, POLICY)).toThrow(PlannerInputError);
    });
  }

  it("rejects a complaint-shaped lock key on the shipped planner", () => {
    expect(() =>
      allocateHours(EMBEDDED_DEMO.areas, 80, 8, true, new Map([["complaint_weight", 8]])),
    ).toThrow(PlannerInputError);
  });

  it("rejects a complaint signal carried through the intervention explorer", () => {
    const areas = EMBEDDED_DEMO.areas.map(
      (area) => ({ ...area, complaint_rank: 1 }) as PlanningArea,
    );
    const adjusted = applyIntervention(areas, {
      targetAreaId: "east_village",
      displacedShare: 0.5,
    });
    expect(adjusted).not.toBeNull();
    expect(() => allocateHours(adjusted!.areas, 80, 8, true)).toThrow(PlannerInputError);
  });

  it("makes a complaint-shaped field unrepresentable in both planner input types", () => {
    expect(PLANNING_AREA_EXCLUDES_COMPLAINT_SIGNAL).toBe(true);
    expect(AREA_PLANNING_INPUT_EXCLUDES_COMPLAINT_SIGNAL).toBe(true);
    // The compile-time proof above only binds declared keys, so pin the
    // runtime key set too: a spread that widens PlanningArea in practice
    // shows up here.
    for (const area of EMBEDDED_DEMO.areas) {
      expect(Object.keys(area).sort()).toEqual([
        "auditWape",
        "delta",
        "id",
        "latest",
        "loadDerivation",
        "name",
        "planningLoad",
        "reason",
      ]);
    }
  });

  it("strips the artifact's only complaint-shaped field before the app sees it", () => {
    const planner = (ARTIFACT as { planner?: unknown }).planner;
    expect(() => assertNoComplaintSignal(planner, "artifact planner block")).toThrow(
      PlannerInputError,
    );
    expect(() => assertNoComplaintSignal(adaptDemoV1(ARTIFACT), "adapted demo data")).not.toThrow();
  });

  it("plans identically whether or not the artifact carries its complaint diagnostic", () => {
    const stripped = JSON.parse(JSON.stringify(ARTIFACT)) as {
      planner: { constraints: Record<string, unknown> };
    };
    delete stripped.planner.constraints.complaint_data_used;
    const withDiagnostic = adaptDemoV1(ARTIFACT)?.areas ?? [];
    const withoutDiagnostic = adaptDemoV1(stripped)?.areas ?? [];
    expect(withDiagnostic.length).toBeGreaterThan(0);
    expect(allocateHours(withDiagnostic, 80, 8, true)).toEqual(
      allocateHours(withoutDiagnostic, 80, 8, true),
    );
  });

  // The three checks below exist because the Phase 1 adversarial pass got
  // past everything above it. A name-based guard is beaten by a name: a
  // contractor who calls 311 volume `residentReportIndex`, populates it only
  // from the artifact so the embedded fallback keeps its key set, and adds it
  // to the share weight passes the type proof, the runtime guard, oxlint, and
  // the characterization suite. These assert provenance and influence
  // instead, which a rename does not survive.
  // See docs/project/PHASE1_ADVERSARIAL.md, route 2b.

  it("ignores any field the adapter did not declare, on the shipped planner", () => {
    // The projection below lists exactly the eight keys of `PlanningArea`, so
    // on its own it compares a deep copy with itself and would pass with the
    // allocator reading every field there is. It is kept because it fails the
    // day `adaptDemoV1` emits a ninth key that allocation then reads — but the
    // claim in the name is carried by the injection, not by the projection.
    const full = adaptDemoV1(ARTIFACT)?.areas ?? [];
    expect(full.length).toBeGreaterThan(0);
    const declared = full.map(
      (area) =>
        ({
          id: area.id,
          name: area.name,
          latest: area.latest,
          delta: area.delta,
          planningLoad: area.planningLoad,
          loadDerivation: area.loadDerivation,
          auditWape: area.auditWape,
          reason: area.reason,
        }) as PlanningArea,
    );
    // Route 2b, executed: fields a contractor could add and then weight. None
    // is complaint-shaped by name, so no guard sees them; the plan must be
    // byte-identical anyway.
    const smuggled = full.map((area, index) => ({
      ...area,
      residentReportIndex: 900 - index * 7,
      urgencyWeight: index % 3,
      escalations: index * 11,
    })) as PlanningArea[];
    for (const budget of [48, 80, 400]) {
      const reference = allocateHours(full, budget, 8, true);
      expect(allocateHours(declared, budget, 8, true), `declared @ ${budget}`).toEqual(reference);
      expect(allocateHours(smuggled, budget, 8, true), `smuggled @ ${budget}`).toEqual(reference);
    }
  });

  it("ignores any field beyond the declared inputs, on the domain planner", () => {
    // Same shape as the test above, and the same correction: `domainAreas()`
    // constructs exactly these six keys, so the projection alone compares an
    // object graph with itself. The undeclared fields are what the name rests
    // on.
    const areas = domainAreas();
    const declared = areas.map(
      (area) =>
        ({
          area_id: area.area_id,
          label: area.label,
          forecast_upper: area.forecast_upper,
          forecast_lower: area.forecast_lower,
          drop_test: area.drop_test,
          included: area.included,
        }) as AreaPlanningInput,
    );
    const smuggled = areas.map((area, index) => ({
      ...area,
      residentReportIndex: 900 - index * 7,
      urgencyWeight: index % 3,
    })) as AreaPlanningInput[];
    const reference = buildPlan(areas, POLICY);
    expect(buildPlan(declared, POLICY)).toEqual(reference);
    expect(buildPlan(smuggled, POLICY)).toEqual(reference);
  });

  it("produces the same plan when the artifact's 311 diagnostic is deleted outright", () => {
    // `reporting_bias` is the only 311-derived block in the artifact. If any
    // planning value ever draws on it — under any field name — this fails.
    const stripped = JSON.parse(JSON.stringify(ARTIFACT)) as Record<string, unknown>;
    delete stripped.reporting_bias;
    const without = adaptDemoV1(stripped);
    const full = adaptDemoV1(ARTIFACT);
    expect(without?.areas).toEqual(full?.areas);
    expect(without?.forecast).toEqual(full?.forecast);
    expect(allocateHours(without?.areas ?? [], 80, 8, true)).toEqual(
      allocateHours(full?.areas ?? [], 80, 8, true),
    );
  });

  /*
   * Attacks C and D, from the independent review track's escalation
   * (review/ESCALATION.md). Both were executed and both succeeded against the
   * first version of this suite: complaint volume carried in `planning_load`
   * is invisible to a name-based guard, and `planning_load` was validated only
   * as "a non-negative number". They live here so they cannot come back.
   */

  const COMPLAINT_VOLUME: Record<string, number> = {
    "East Village": 4120,
    "City Center": 980,
    Gaslamp: 2600,
    Cortez: 310,
    Columbia: 145,
    Marina: 60,
  };

  it("attack C: refuses an artifact whose planning load is complaint volume", () => {
    const poisoned = JSON.parse(JSON.stringify(ARTIFACT)) as {
      planner: { allocations: Array<Record<string, unknown>> };
    };
    for (const row of poisoned.planner.allocations) {
      row.planning_load = COMPLAINT_VOLUME[row.area as string];
    }
    // Nothing is renamed, and the artifact still declares that complaint data
    // was not used. The refusal has to come from the value, not the label.
    expect(adaptDemoV1(ARTIFACT)).not.toBeNull();
    expect(adaptDemoV1(poisoned)).toBeNull();
  });

  it("attack C: dropping the derivation claim does not buy the attacker anything", () => {
    // The guarantee rests on arithmetic, not on the label, because the label
    // is the one thing an attacker gets to write. Removing it while the
    // number still reconciles is honest and stays accepted; removing it to
    // hide a substituted number is refused all the same.
    const undeclared = JSON.parse(JSON.stringify(ARTIFACT)) as {
      planner: { allocations: Array<Record<string, unknown>> };
    };
    for (const row of undeclared.planner.allocations) delete row.planning_load_derivation;
    expect(adaptDemoV1(undeclared)).not.toBeNull();

    for (const row of undeclared.planner.allocations) {
      row.planning_load = COMPLAINT_VOLUME[row.area as string];
    }
    expect(adaptDemoV1(undeclared)).toBeNull();
  });

  it("attack C: refuses a derivation name that is not on the allowlist", () => {
    const invented = JSON.parse(JSON.stringify(ARTIFACT)) as {
      planner: { allocations: Array<Record<string, unknown>> };
    };
    for (const row of invented.planner.allocations) {
      row.planning_load_derivation = "resident_report_density";
    }
    expect(adaptDemoV1(invented)).toBeNull();
  });

  it("refuses an area with no forecast that does not say where its load came from", () => {
    // An area with insufficient forecast evidence is a normal state, and it
    // still needs staffing. What it may not do is carry an unexplained load:
    // that is the shape complaint volume arrives in.
    const noForecast = JSON.parse(JSON.stringify(ARTIFACT)) as {
      forecast: { areas: Array<Record<string, unknown>> };
      planner: { allocations: Array<Record<string, unknown>> };
    };
    for (const row of noForecast.forecast.areas) {
      row.status = "insufficient_forecast_evidence";
      row.upper = null;
      row.lower = null;
      row.point = null;
    }
    expect(adaptDemoV1(noForecast)).toBeNull();

    // Declaring a permitted fallback is accepted only when the number
    // reconciles with the observation it claims to be.
    const latest = new Map(
      (
        (ARTIFACT.observations as { latest_by_area?: Array<Record<string, unknown>> })
          ?.latest_by_area ?? []
      ).map((row) => [row.area as string, row.total as number]),
    );
    for (const row of noForecast.planner.allocations) {
      row.planning_load_derivation = "latest_observed_total";
      row.planning_load = latest.get(row.area as string);
    }
    const adapted = adaptDemoV1(noForecast);
    expect(adapted?.areas.map((area) => area.loadDerivation)).toEqual(
      adapted?.areas.map(() => "latest_observed_total"),
    );

    for (const row of noForecast.planner.allocations) {
      row.planning_load = COMPLAINT_VOLUME[row.area as string];
    }
    expect(adaptDemoV1(noForecast)).toBeNull();
  });

  it("attack D: refuses planner input whose planning load has no permitted derivation", () => {
    const areas = Object.entries(COMPLAINT_VOLUME).map(
      ([name, volume]) =>
        ({
          id: name.toLowerCase().replaceAll(" ", "_"),
          name,
          latest: null,
          delta: 0,
          planningLoad: volume,
          auditWape: null,
          reason: "complaint density",
        }) as unknown as PlanningArea,
    );
    expect(() => allocateHours(areas, 600, 20, true)).toThrow(PlannerInputError);
    expect(() => allocateHours(areas, 600, 20, true)).toThrow(/not one of/);
  });

  it("keeps the artifact's own declaration that complaint data was not used", () => {
    const constraints = (ARTIFACT.planner as { constraints?: Record<string, unknown> } | undefined)
      ?.constraints;
    expect(constraints?.complaint_data_used).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * 2. No complaint identifier in allocation code (the lint-level guard)
 * ------------------------------------------------------------------ */

// oxlint does not implement `no-restricted-syntax`, and its
// `no-restricted-properties` can only name exact property strings, so it
// catches `area.complaintVolume` but not `const complaints = ...` or
// `sortByComplaints()`. app/.oxlintrc.json carries the property-level rule as
// a fast first layer; this test is the guard that actually holds the line.
// Scope is by behavior, not by folder: any module that names a planner
// entry point or computes planning load is allocation code, wherever it
// lives. A decomposition that moves the planner does not move it out of
// scope, and a new adapter that feeds it is in scope the day it is written.
const ALLOCATION_MODULES = SOURCE_FILES.filter((file) => {
  if (/(planner|allocat|intervention)/i.test(file.slice(SRC.length))) return true;
  const { code } = partition(readFileSync(file, "utf8"));
  return /\b(?:planningLoad|planning_load|relativeLoad|relative_load|allocateHours|buildPlan|PlanningArea|AreaPlanningInput|AreaAllocation)\b/.test(
    code,
  );
});

const COMPLAINT_IDENTIFIER = /complaint|311|service_request|call_volume|report_volume|nuisance/i;

/**
 * The only names allowed to mention a complaint: the guard machinery itself.
 * Adding to this list is how the exclusion would be dismantled, so anything
 * new here should be argued for in review, not waved through.
 */
const DECLARED_GUARD_NAMES = new Set([
  "assertNoComplaintSignal",
  // The shared refusal vocabulary in `domain/vocabulary/refusedTerms.ts`,
  // and the local alias each guard binds it to. One policy with several
  // call sites, rather than a copy per guard.
  "COMPLAINT_SIGNAL",
  "COMPLAINT_FIELD_PATTERN",
  // The accent-folding predicate that replaced the bare regex at the two
  // call sites, and the alias each binds it to. `denuncias` was refused and
  // `denúncias` accepted before folding; matching the raw string is now the
  // mistake, so the predicate is the thing guards are supposed to reach for.
  "isComplaintShaped",
  "isComplaintFieldName",
  "ComplaintShapedKey",
  "ComplaintShapedKeysOf",
  "ExcludesComplaintSignal",
  "AREA_PLANNING_INPUT_EXCLUDES_COMPLAINT_SIGNAL",
  "PLANNING_AREA_EXCLUDES_COMPLAINT_SIGNAL",
]);

describe("refusal: no complaint or 311 identifier is reachable from allocation code", () => {
  it("scopes the scan to every planner and allocation module", () => {
    const names = ALLOCATION_MODULES.map((file) => file.slice(SRC.length + 1));
    expect(names).toContain("lib/planner.ts");
    expect(names).toContain("domain/planner/planner.ts");
    expect(names).toContain("lib/intervention.ts");
    // The adapter that computes planning load is allocation code too: that
    // is where a laundered field would be filled in from the artifact.
    expect(names).toContain("lib/demo.ts");
  });

  for (const file of ALLOCATION_MODULES) {
    it(`${file.slice(SRC.length + 1)} declares no complaint-shaped identifier`, () => {
      const { code } = partition(readFileSync(file, "utf8"));
      const offenders = [...code.matchAll(/[A-Za-z_$][\w$]*/g)]
        .map((match) => match[0])
        .filter((name) => COMPLAINT_IDENTIFIER.test(name) && !DECLARED_GUARD_NAMES.has(name));
      expect(offenders).toEqual([]);
    });
  }

  it("no allocation module declares a complaint, nuisance, or severity ranking helper", () => {
    for (const file of ALLOCATION_MODULES) {
      const { code } = partition(readFileSync(file, "utf8"));
      expect(code).not.toMatch(/sortBy(?:Complaint|Nuisance|Upset|Report)/i);
      expect(code).not.toMatch(/\b(?:priority|severity|nuisance)(?:Rank|Score|Order|Index)\b/i);
    }
  });

  it("neither planner exposes a rank, priority, or severity field", () => {
    const plan = buildPlan(domainAreas(), POLICY);
    // The plan object itself, not only its rows: a plan-level `priority_order`
    // would have passed a check that read the allocations alone.
    for (const key of Object.keys(plan)) {
      expect(key).not.toMatch(/rank|priority|severity|nuisance|complaint/i);
    }
    for (const allocation of plan.allocations) {
      for (const key of Object.keys(allocation)) {
        expect(key).not.toMatch(/rank|priority|severity|nuisance|complaint/i);
      }
    }
    // "Neither planner" means the shipped one too, and at the plan level as
    // well as the row level. The row pin below was the whole of the shipped
    // half, so a plan-level `priority_order` on `PlanResult` would have passed
    // the check whose own comment says it must not.
    const shipped = allocateHours(EMBEDDED_DEMO.areas, 80, 8, true);
    for (const key of Object.keys(shipped)) {
      expect(key).not.toMatch(/rank|priority|severity|nuisance|complaint/i);
    }
    for (const allocation of shipped.allocations) {
      expect(Object.keys(allocation).sort()).toEqual(["areaId", "hours"]);
    }
  });

  it("orders allocations by area identity, never by load", () => {
    // C-01 R-02: a list ordered by severity reads as a target list. The
    // domain planner sorts by area_id; the shipped planner preserves the
    // caller's order. Neither may order by magnitude.
    const areas = domainAreas();
    const plan = buildPlan(areas, POLICY);
    expect(plan.allocations.map((a) => a.area_id)).toEqual(
      [...areas].map((a) => a.area_id).sort((a, b) => a.localeCompare(b)),
    );

    const reversed = [...EMBEDDED_DEMO.areas].reverse();
    expect(allocateHours(reversed, 80, 8, true).allocations.map((a) => a.areaId)).toEqual(
      reversed.map((a) => a.id),
    );
  });
});

/* ------------------------------------------------------------------ *
 * 3. The four sentences the product will not say
 * ------------------------------------------------------------------ */

describe("refusal: the four claims the product will not make", () => {
  it("extracts a copy corpus large enough to be meaningful", () => {
    // A silently broken extractor would make every check below vacuous.
    expect(CORPUS.length).toBeGreaterThan(600);
    const files = new Set(CORPUS.map((chunk) => chunk.where));
    expect(files).toContain("App.tsx");
    expect(files).toContain("lib/demo.ts");
    expect(files).toContain("generated/demo.v1.json");
    expect(files).toContain("planner output");
  });

  it("emits no user-facing string carrying a forbidden claim", () => {
    const violations = scan(CORPUS);
    expect(
      violations.map((v) => `${v.where}: [${v.refusal}] matched "${v.matched}" in "${v.text}"`),
    ).toEqual([]);
  });

  for (const { refusal, patterns } of REFUSALS) {
    it(`catches a rewording of: ${refusal}`, () => {
      // The point of the scan is that a contractor never types the README
      // sentence. Each probe is a plausible paraphrase, and each must fail.
      const probes: Record<string, string[]> = {
        "These people moved from one block or neighborhood to another.": [
          "Roughly 40 residents relocated to Gaslamp over the same period.",
          "The people counted here moved to the adjacent neighborhood.",
          "This view tracks individuals across the downtown core.",
        ],
        "A policy caused the decline.": [
          "The ordinance reduced the downtown count by 14%.",
          "The drop was due to the encampment policy.",
          "This confirms that the new program brought about the decline.",
        ],
        "This area needs enforcement.": [
          "East Village needs enforcement this week.",
          "Use this priority ranking to schedule the next sweep.",
          "Highest-abatement blocks are listed first.",
        ],
        "A shelter has capacity or someone is eligible for a service.": [
          "There are 12 shelter beds available tonight.",
          "Anyone counted here is eligible for the bridge program.",
          "Service capacity for this area is sufficient.",
        ],
        "Complaint volume is need, demand, or a reason to go somewhere.": [
          "Areas are sorted by complaints so the team goes where people are upset.",
          "311 volume is the best available proxy for demand.",
          "Complaint severity ranks the six neighborhoods.",
        ],
      };
      // A refusal with no probe would make this test vacuous, which is the
      // exact shape being audited out of this suite: assert the probes
      // exist before asserting they are caught.
      expect(probes[refusal], `no probe written for: ${refusal}`).toBeDefined();
      expect((probes[refusal] ?? []).length).toBeGreaterThanOrEqual(3);
      for (const probe of probes[refusal] ?? []) {
        const violations = scan([{ where: "probe", text: probe, context: "" }]);
        expect(
          violations.map((v) => v.refusal),
          `no pattern matched the probe: ${probe}`,
        ).toContain(refusal);
      }
      expect(patterns.length).toBeGreaterThan(0);
    });
  }

  it("still allows the product to name a refusal in order to disclaim it", () => {
    const disclaimers: Chunk[] = [
      {
        where: "probe",
        text: "person tracking, causal claims, enforcement, eligibility decisions, or automatic dispatch.",
        context: "Never authorized:",
      },
      {
        where: "probe",
        text: "These are on-site observations: they cannot say who moved where, or why.",
        context: "",
      },
      {
        where: "probe",
        text: "Clearing an area adds no shelter capacity.",
        context: "",
      },
    ];
    expect(scan(disclaimers)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 3b. The four claims, in every language the product speaks
 * ------------------------------------------------------------------ */

/**
 * The refusals are a property of the product, not of English.
 *
 * The scan above reads source files, so a message catalogue is already in the
 * corpus — but "already in the corpus" is exactly the kind of accident that
 * stops being true after one refactor, and it says nothing about whether the
 * *rules* can see the language the copy is written in. This block names each
 * locale, scans its catalogue, and proves the rules fire on that language's
 * own wording. Adding a locale without adding its rules fails here.
 */
const CATALOGUE_CHUNKS: Record<Locale, Chunk[]> = Object.fromEntries(
  LOCALES.map((locale) => {
    const chunks: Chunk[] = [];
    let previous = "";
    for (const [key, text] of Object.entries(CATALOGUES[locale])) {
      chunks.push({ where: `i18n/${locale}.ts (${key})`, text, context: previous });
      previous = text;
    }
    return [locale, chunks];
  }),
) as Record<Locale, Chunk[]>;

/** Rewordings that must be caught in Spanish, one per refusal. */
const ES_PROBES: Record<string, string[]> = {
  "These people moved from one block or neighborhood to another.": [
    "Unos 40 residentes se trasladaron a Gaslamp en el mismo periodo.",
    "Las personas contadas aquí se mudaron al barrio vecino.",
    "Esta vista rastrea personas por todo el centro.",
  ],
  "A policy caused the decline.": [
    "La ordenanza redujo el conteo del centro en 14%.",
    "La caída se debe a la política sobre campamentos.",
    "Esto confirma que el programa nuevo funcionó.",
  ],
  "This area needs enforcement.": [
    "East Village necesita desalojo esta semana.",
    "Use esta lista de prioridad para programar la próxima barrida.",
    "Las cuadras con más desalojos aparecen primero.",
  ],
  "A shelter has capacity or someone is eligible for a service.": [
    "Hay 12 camas disponibles esta noche.",
    "Cualquiera contado aquí es elegible para el programa puente.",
    "La capacidad de servicio para esta área es suficiente.",
  ],
  "Complaint volume is need, demand, or a reason to go somewhere.": [
    "Las áreas están ordenadas por quejas para ir a donde la gente está molesta.",
    "El volumen de 311 es la mejor aproximación disponible de la demanda.",
    "La gravedad de las denuncias clasifica los seis barrios.",
  ],
};

describe("refusal: the four claims are refused in every language, not only English", () => {
  it("ships a rule set for every locale the app can be read in", () => {
    expect(LOCALES).toContain("en");
    expect(LOCALES).toContain("es");
    // One rule set per locale, so a new language cannot be added silently.
    expect([REFUSALS, REFUSALS_ES]).toHaveLength(LOCALES.length);
    for (const rules of [REFUSALS, REFUSALS_ES]) {
      expect(rules.map((rule) => rule.refusal).sort()).toEqual(
        REFUSALS.map((rule) => rule.refusal).sort(),
      );
    }
  });

  for (const locale of LOCALES) {
    it(`extracts a catalogue for ${locale} large enough to be meaningful`, () => {
      expect(CATALOGUE_CHUNKS[locale].length).toBeGreaterThan(500);
    });

    it(`emits no ${locale} message carrying a forbidden claim`, () => {
      const violations = scan(CATALOGUE_CHUNKS[locale]);
      expect(
        violations.map((v) => `${v.where}: [${v.refusal}] matched "${v.matched}" in "${v.text}"`),
      ).toEqual([]);
    });
  }

  it("keeps every locale's key set identical, so no screen is half-translated", () => {
    const reference = Object.keys(CATALOGUES.en).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(CATALOGUES[locale]).sort(), locale).toEqual(reference);
    }
  });

  for (const { refusal, patterns } of REFUSALS_ES) {
    it(`catches a Spanish rewording of: ${refusal}`, () => {
      expect(ES_PROBES[refusal], `no Spanish probe written for: ${refusal}`).toBeDefined();
      expect((ES_PROBES[refusal] ?? []).length).toBeGreaterThanOrEqual(3);
      expect(patterns.length).toBeGreaterThan(0);
      for (const probe of ES_PROBES[refusal] ?? []) {
        const violations = scan([{ where: "probe", text: probe, context: "" }], REFUSALS_ES);
        expect(
          violations.map((v) => v.refusal),
          `no Spanish pattern matched the probe: ${probe}`,
        ).toContain(refusal);
      }
    });
  }

  it("still allows the Spanish copy to name a refusal in order to disclaim it", () => {
    const disclaimers: Chunk[] = [
      {
        where: "probe",
        text: "el seguimiento de personas, las afirmaciones causales, la aplicación de la ley, las decisiones de elegibilidad ni el despacho automático.",
        context: "Nunca se autoriza:",
      },
      {
        where: "probe",
        text: "Estas son observaciones hechas en el lugar: no pueden decir quién se movió a dónde, ni por qué.",
        context: "",
      },
      {
        where: "probe",
        text: "Despejar un área no agrega capacidad de refugio.",
        context: "",
      },
    ];
    expect(scan(disclaimers)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 4. Every displayed metric resolves to the source ledger
 * ------------------------------------------------------------------ */

const LEDGER = readFileSync(join(REPO, "data/cards/source_ledger.yaml"), "utf8");
const CHECKSUMS = readFileSync(join(REPO, "data/cards/checksums.sha256"), "utf8");

const LEDGER_RAW_PATHS = [...LEDGER.matchAll(/^\s*-?\s*raw_path:\s*(\S+)\s*$/gm)].map(
  (match) => match[1] ?? "",
);
const LEDGER_ARTIFACTS = [...LEDGER.matchAll(/(?:^\s*artifact:\s*|^\s{6,}-\s+)(\S+\.json)\s*$/gm)]
  .map((match) => match[1] ?? "")
  .filter((path) => path.includes("/"));
const PINNED_PATHS = new Set(
  CHECKSUMS.split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => line.split(/\s+/, 2)[1] ?? ""),
);

describe("refusal: no displayed number without a source-ledger entry", () => {
  it("reads a ledger that actually declares artifacts and raw inputs", () => {
    expect(LEDGER_RAW_PATHS.length).toBeGreaterThan(5);
    expect(LEDGER_ARTIFACTS.length).toBeGreaterThan(0);
    expect(PINNED_PATHS.size).toBeGreaterThan(5);
  });

  it("resolves the artifact the app names as its source", () => {
    const generated = adaptDemoV1(ARTIFACT);
    expect(generated?.origin).toBe("generated");
    const named = generated?.source.artifact ?? "";
    expect(
      LEDGER_ARTIFACTS.some((path) => path === named || path.endsWith(`/${named}`)),
      `${named} is not declared in data/cards/source_ledger.yaml`,
    ).toBe(true);
  });

  it("resolves every input the shipped artifact declares, failing on any orphan", () => {
    const inputs = Object.keys(
      (ARTIFACT.generated_from as { input_sha256?: Record<string, string> })?.input_sha256 ?? {},
    );
    expect(inputs.length).toBeGreaterThan(0);

    const ledgerBasenames = new Set(LEDGER_RAW_PATHS.map((path) => basename(path)));
    const pinnedBasenames = new Set([...PINNED_PATHS].map((path) => basename(path)));

    const orphans = inputs.filter(
      (name) => !ledgerBasenames.has(name) || !pinnedBasenames.has(name),
    );
    expect(orphans).toEqual([]);
  });

  it("declares the embedded fallback as a fallback, not as a ledgered source", () => {
    // The offline snapshot is the one displayed thing with no upstream file.
    // It has to say so, or a screenshot of it reads as ledgered data.
    expect(EMBEDDED_DEMO.origin).toBe("embedded");
    expect(EMBEDDED_DEMO.source.artifact).toMatch(/embedded/i);
    expect(
      LEDGER_ARTIFACTS.some((path) => path.endsWith(`/${EMBEDDED_DEMO.source.artifact}`)),
    ).toBe(false);
  });
});

// Found by an independent review track after the first version of both guards
// shipped. Object.entries() returns [] for a Map or a Set, so both walks
// accepted either in silence; and a denylist of words meaning "human being"
// was defeated by this project's own vocabulary (SleeperType is a real
// exported type in normalize.py; "household" is on the actuals schema's own
// will-never-compute list).
describe("refusal: the guards see containers and unnamed denominators", () => {
  for (const [name, shape] of [
    ["cost_per_sleeper", { cost_per_sleeper: 12 }],
    ["cost_per_household", { cost_per_household: 12 }],
    ["cost_per_bed", { cost_per_bed: 12 }],
    ["cost_per_enrollee", { cost_per_enrollee: 12 }],
    ["dollars_per_body", { dollars_per_body: 12 }],
    ["costPerPerson", { costPerPerson: 12 }],
    ["a person denominator in prose", { label: "Assumed cost per person served", value: 3.28 }],
    ["a person denominator inside a Map", new Map([["cost_per_person", 12]])],
    ["a person denominator inside a Set", new Set([{ cost_per_client: 3 }])],
  ] as Array<[string, unknown]>) {
    it(`refuses ${name}`, () => {
      expect(() => assertNoPersonDenominator(shape, "refusal probe")).toThrow();
    });
  }

  it("still permits per-hour, per-area, and per-plan, and ordinary words", () => {
    expect(() =>
      assertNoPersonDenominator(
        { cost_per_hour: 45, costPerArea: 3, cost_per_plan: 1, hyperlink: "x", supervisor: "y" },
        "refusal probe",
      ),
    ).not.toThrow();
  });

  it("walks a Map or a Set for a complaint-shaped field", () => {
    expect(() => assertNoComplaintSignal(new Map([["complaint_count", 5]]), "probe")).toThrow();
    expect(() => assertNoComplaintSignal(new Set([{ complaint_count: 5 }]), "probe")).toThrow();
    expect(() =>
      assertNoComplaintSignal({ inner: new Map([["calls_311", 5]]) }, "probe"),
    ).toThrow();
  });
});

/* ------------------------------------------------------------------ *
 * The vocabulary is per locale, and adding a locale cannot widen a guard
 *
 * Escalation 3 was closed by putting one vocabulary behind all five guards.
 * That was the right fix and it left one thing open: the vocabulary was flat
 * bilingual lists, so adding a third language was still an edit somebody had to
 * remember, in a file that would look complete without it. The English-only
 * guard shipped for exactly as long as nobody compared the guard's vocabulary
 * with the app's locale list.
 *
 * So the comparison is a test. `LOCALE_VOCABULARY` must carry an entry for
 * every locale the app can be read in, with real content in each field, and the
 * refused corpus must carry vectors for each. A locale added without them fails
 * here rather than silently widening every guard at once.
 * ------------------------------------------------------------------ */

describe("refusal: the vocabulary covers every shipped locale, structurally", () => {
  const vocabularyLocales = Object.keys(LOCALE_VOCABULARY).sort();

  it("carries an entry for every locale the app can be read in", () => {
    expect(vocabularyLocales).toEqual([...LOCALES].sort());
  });

  for (const locale of LOCALES) {
    it(`gives ${locale} a connector, complaint terms, denominators, and both closed classes`, () => {
      const entry = LOCALE_VOCABULARY[locale as VocabularyLocale];
      expect(entry, `no vocabulary entry for ${locale}`).toBeDefined();
      // Every field carries weight. `connectors` is the one that looks
      // optional and is not: the original Escalation 3 bug was a missing
      // connector, not a missing word. Without it the rate extractor never
      // engages and the allowlist never runs, so a key is neither refused nor
      // permitted -- it is invisible.
      expect(entry.connectors.length, "connectors").toBeGreaterThan(0);
      expect(entry.complaintTerms.length, "complaintTerms").toBeGreaterThan(0);
      expect(entry.permittedDenominators.length, "permittedDenominators").toBeGreaterThan(0);
      expect(entry.distributiveWords.length, "distributiveWords").toBeGreaterThan(0);
      expect(entry.referenceWords.length, "referenceWords").toBeGreaterThan(0);
    });

    it(`gives ${locale} refusal vectors for all three guarded shapes`, () => {
      const corpus = REFUSED_CORPUS[locale as VocabularyLocale];
      expect(corpus, `no refused corpus for ${locale}`).toBeDefined();
      expect(corpus.complaintKeys.length, "complaintKeys").toBeGreaterThan(0);
      expect(corpus.personDenominatorKeys.length, "personDenominatorKeys").toBeGreaterThan(0);
      expect(corpus.personDenominatorProse.length, "personDenominatorProse").toBeGreaterThan(0);
    });

    it(`gives ${locale} legitimate vectors that must keep passing`, () => {
      // Half of a vocabulary sweep's risk is over-refusal. A guard that
      // refuses `porcentaje` because it contains "por" is broken in a way that
      // reaches an adopter as a crash, not as a caught attack.
      const corpus = PERMITTED_CORPUS[locale as VocabularyLocale];
      expect(corpus, `no permitted corpus for ${locale}`).toBeDefined();
      expect(corpus.keys.length, "keys").toBeGreaterThan(0);
      expect(corpus.prose.length, "prose").toBeGreaterThan(0);
    });

    it(`refuses every ${locale} complaint key at the planner and the share link`, () => {
      for (const key of REFUSED_CORPUS[locale as VocabularyLocale].complaintKeys) {
        expect(() => assertNoComplaintSignal({ [key]: 1 }, "area"), key).toThrow(PlannerInputError);
        expect(() => assertNoComplaintSignal({ [`area_${key}_total`]: 1 }, "area"), key).toThrow(
          PlannerInputError,
        );
        // A Map key is the shape that slipped past one call site before.
        expect(() => assertNoComplaintSignal(new Map([[key, 1]]), "locks"), key).toThrow(
          PlannerInputError,
        );
        // Fold before slugifying: `denúncias` would otherwise become
        // `den_ncias`, which is a different word and not the vector.
        const areaId = foldForMatch(key)
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "");
        if (/^[a-z0-9]+(_[a-z0-9]+)*$/.test(areaId)) {
          expect(() => shareStateWithArea(areaId), areaId).toThrow();
        }
      }
    });

    it(`refuses every ${locale} person-denominator key and prose in a cost summary`, () => {
      const corpus = REFUSED_CORPUS[locale as VocabularyLocale];
      for (const key of corpus.personDenominatorKeys) {
        expect(() => assertNoPersonDenominator({ [key]: 1 }, "summary"), key).toThrow();
        expect(() => assertNoPersonDenominator({ nested: { [key]: 1 } }, "summary"), key).toThrow();
      }
      for (const prose of corpus.personDenominatorProse) {
        expect(() => assertNoPersonDenominator({ note: prose }, "summary"), prose).toThrow();
        expect(() => assertNoPersonDenominator([prose], "summary"), prose).toThrow();
      }
    });

    it(`accepts every legitimate ${locale} key and sentence — zero over-refusals`, () => {
      const corpus = PERMITTED_CORPUS[locale as VocabularyLocale];
      for (const key of corpus.keys) {
        expect(() => assertNoPersonDenominator({ [key]: 1 }, "summary"), key).not.toThrow();
        expect(() => assertNoComplaintSignal({ [key]: 1 }, "area"), key).not.toThrow();
      }
      for (const prose of corpus.prose) {
        expect(() => assertNoPersonDenominator({ note: prose }, "summary"), prose).not.toThrow();
      }
    });
  }

  it("keeps the compile-time key chain in step with the runtime vocabulary", () => {
    // TypeScript cannot build a conditional chain from a runtime array, so the
    // two halves are written separately and this is what stops them drifting.
    // Drift is not hypothetical: the runtime regex learned Spanish in one
    // commit and the type chain did not, which is half of Escalation 3.
    const chain = readFileSync(join(SRC, "domain/planner/types.ts"), "utf8");
    const declared = chain.slice(
      chain.indexOf("export type ComplaintShapedKey"),
      chain.indexOf("export type ComplaintShapedKeysOf"),
    );
    // The chain's branches are stems, and a stem matches its own plural
    // because each branch is `${string}stem${string}`. So the question is not
    // "is this exact word in the chain" but "would the chain match it".
    const branches = [...declared.matchAll(/\$\{string\}([a-z0-9_]+)\$\{string\}/g)].map(
      (match) => match[1] ?? "",
    );
    expect(branches.length, "no branches parsed out of the type chain").toBeGreaterThan(5);
    const missing: string[] = [];
    for (const locale of Object.keys(LOCALE_VOCABULARY) as VocabularyLocale[]) {
      for (const term of LOCALE_VOCABULARY[locale].complaintTerms) {
        if (!branches.some((branch) => term.includes(branch))) missing.push(`${locale}:${term}`);
      }
    }
    // Terms in `complaintPatterns` are exempt and the exemption is named, not
    // inferred: the refusal suite scans this repository's own source for copy
    // the product will not emit, and the enforcement verb has no spelling that
    // can sit in a template-literal type and pass that scan. The runtime guard
    // still refuses it. Pinning the count here means a SECOND term cannot go
    // missing quietly behind the first.
    const exempt = Object.values(LOCALE_VOCABULARY).flatMap((entry) => entry.complaintPatterns);
    expect(exempt).toHaveLength(1);
    expect(missing).toEqual([]);
  });

  it("names the connectors it does not implement, so the next language brings one", () => {
    // V-5: only `per` and `por` engage the rate extractor. French `par` and
    // German `pro` would fail exactly the way `por` did -- not refused, not
    // allowlisted, invisible. Not a live defect, because neither ships. It is
    // recorded because the vocabulary file will look like the only thing that
    // needs touching, and it is not.
    expect(Object.keys(UNSHIPPED_CONNECTORS).length).toBeGreaterThan(0);
    for (const [connector, language] of Object.entries(UNSHIPPED_CONNECTORS)) {
      expect(language.length, connector).toBeGreaterThan(0);
      const shipped = Object.values(LOCALE_VOCABULARY).flatMap((entry) => [...entry.connectors]);
      expect(shipped, `${connector} is listed as unshipped but is implemented`).not.toContain(
        connector,
      );
    }
  });
});
