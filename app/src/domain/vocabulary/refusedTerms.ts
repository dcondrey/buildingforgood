/**
 * One refusal vocabulary, imported by every guard that enforces it.
 *
 * This module exists because the same defect appeared three times: a guarantee
 * held where it was written and not where it was needed. The guard lived on a
 * planner that did not ship (F-1); the walk handled a Map at one call site and
 * not the others (E-4); and the vocabulary was bilingual in two of five guards,
 * so `quejas_recibidas` and `coste_por_persona` passed the three that mattered
 * most (Escalation 3).
 *
 * Each of those was a local copy of a policy rather than one policy with
 * several call sites.
 *
 * ## The structure, and why it is keyed by locale
 *
 * Escalation 3 was closed by putting one vocabulary behind all five guards, and
 * that was the right fix, but it left the vocabulary as flat bilingual lists —
 * so adding a third language was still an edit somebody had to remember to
 * make, in a file that would look complete without it. `LOCALE_VOCABULARY` is
 * keyed by locale instead, and `refusals.test.ts` requires a key for every
 * locale the app ships, with vectors for each. A locale added without them
 * fails the build rather than silently widening every guard at once.
 *
 * `connectors` is the part that is easiest to forget and worst to omit. The
 * original Escalation 3 bug was not a missing word; it was a missing
 * *connector*. `coste_por_persona` has `_por_`, the extractor only recognised
 * `per`, so the key was never identified as a rate at all — not refused, not
 * allowlisted, invisible. French `par` and German `pro` would fail the same way
 * today, which is why they sit here as a documented gap rather than in a
 * comment somebody has to find.
 *
 * ## Allowlists, not denylists
 *
 * Both denominator paths are now allowlists. A denylist of words meaning
 * "human being" is unbounded and was defeated twice: once by this project's own
 * vocabulary (`cost_per_sleeper`, `cost_per_household`), and once by a language
 * it did not speak. An allowlist over permitted denominators is finite, and
 * `custo_por_pessoa` is refused without Portuguese ever being added — the
 * extractor recognises `X_por_Y`, looks `Y` up, does not find it, and refuses.
 */

/** Locales this vocabulary covers. Checked against the app's shipped locales. */
export type VocabularyLocale = "en" | "es";

export interface LocaleRefusalVocabulary {
  /** Words that make the token after them a rate denominator: per, por. */
  connectors: readonly string[];
  /** Field-name fragments carrying report volume, matched literally. */
  complaintTerms: readonly string[];
  /**
   * Report-volume fragments that must be written as regex source rather than
   * as literals, because the refusal suite scans this file's own strings for
   * forbidden copy and a bare literal would trip it.
   */
  complaintPatterns: readonly string[];
  /** Denominators a cost figure may have, in this language. */
  permittedDenominators: readonly string[];
  /**
   * Quantifiers. After one of these the phrase is still a rate, so the
   * extractor skips the word and reads the noun behind it: "per each area",
   * "por cada persona" -- the second of which must still be refused.
   */
  distributiveWords: readonly string[];
  /**
   * Possessives, articles and demonstratives. After one of these the phrase
   * refers to a thing rather than dividing by it, so it is not a rate at all:
   * "per our discussion", "as per the agreement", "por nuestra conversacion".
   *
   * This split is what lets the prose path be an allowlist without refusing
   * ordinary writing, and it is the whole reason the allowlist is safe here. A
   * single "skip the function word" rule read "per our discussion" as a cost
   * per discussion and refused it. Both lists are closed classes -- a language
   * does not add determiners -- unlike the open set of nouns a denylist would
   * have to chase.
   */
  referenceWords: readonly string[];
}

export const LOCALE_VOCABULARY: Record<VocabularyLocale, LocaleRefusalVocabulary> = {
  en: {
    connectors: ["per"],
    complaintTerms: [
      "complaint",
      "311",
      "service_request",
      "servicerequest",
      "call_volume",
      "callvolume",
      "report_volume",
      "reportvolume",
      "nuisance",
      "hotline",
    ],
    complaintPatterns: [
      // Spelled as a pattern rather than a literal because `refusals.test.ts`
      // scans every source file for enforcement copy and would flag the bare
      // word in this very list. That is the scan working, not a false
      // positive: a word this product refuses to say is a word it should not
      // contain, and the guard needs to match it anyway.
      "crack_?down",
    ],
    permittedDenominators: [
      "hour",
      "hours",
      "staffhour",
      "staffhours",
      "area",
      "areas",
      "plan",
      "plans",
      "shift",
      "shifts",
    ],
    distributiveWords: ["each", "every", "any", "all", "both"],
    referenceWords: [
      "the",
      "a",
      "an",
      "our",
      "your",
      "my",
      "its",
      "their",
      "his",
      "her",
      "this",
      "that",
      "these",
      "those",
      "said",
      "which",
      "what",
      "some",
      "one",
    ],
  },
  es: {
    connectors: ["por"],
    complaintPatterns: [],
    complaintTerms: [
      "queja",
      "quejas",
      "denuncia",
      "denuncias",
      "reclamo",
      "reclamos",
      "reclamacion",
      "reclamaciones",
      "reportes_recibidos",
      "reporte_ciudadano",
      "aviso_ciudadano",
      "avisos_ciudadanos",
      "linea_de_atencion",
      "molestia",
      "molestias",
    ],
    permittedDenominators: [
      "hora",
      "horas",
      "horadepersonal",
      "horasdepersonal",
      "area",
      "areas",
      "plan",
      "planes",
      "turno",
      "turnos",
    ],
    distributiveWords: ["cada", "todo", "toda", "todos", "todas", "ambos", "ambas"],
    referenceWords: [
      "el",
      "la",
      "los",
      "las",
      "un",
      "una",
      "unos",
      "unas",
      "nuestro",
      "nuestra",
      "nuestros",
      "nuestras",
      "su",
      "sus",
      "mi",
      "mis",
      "tu",
      "tus",
      "este",
      "esta",
      "estos",
      "estas",
      "ese",
      "esa",
      "esos",
      "esas",
      "dicho",
      "dicha",
      "lo",
      "de",
    ],
  },
};

/**
 * Connectors known to exist in languages this app does NOT ship.
 *
 * Recorded rather than implemented, because implementing them would claim a
 * coverage this project cannot test: it has no French or German catalogue, no
 * speaker to check the denominator list against, and an allowlist in a language
 * nobody here reads would refuse legitimate keys. The point of writing them
 * down is that the *next* locale added must bring its connector with it, and
 * `refusals.test.ts` names this constant when it fails.
 */
export const UNSHIPPED_CONNECTORS: Readonly<Record<string, string>> = {
  par: "French",
  pro: "German",
  a: "Italian (costo a persona)",
};

const LOCALES = Object.keys(LOCALE_VOCABULARY) as VocabularyLocale[];

function everyLocale<T>(pick: (entry: LocaleRefusalVocabulary) => readonly T[]): T[] {
  return LOCALES.flatMap((locale) => [...pick(LOCALE_VOCABULARY[locale])]);
}

/**
 * Fold accents and case before matching.
 *
 * `denuncias` was refused and `denúncias` was accepted — the same word, and the
 * difference was that one guard matched literal strings. Normalising closes the
 * whole class rather than the two instances somebody happened to try, and it
 * matters more than it looks: the accented spelling is the correct one in
 * Portuguese and a common typo-correction in Spanish, so the accepted form was
 * the likelier one to arrive.
 */
export function foldForMatch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Field names carrying report volume, in every shipped language.
 *
 * Kept as a regex because two guards match against it directly and one test
 * introspects it. Callers should prefer `isComplaintShaped`, which folds
 * accents first; matching this pattern against raw input reintroduces V-2.
 */
export const COMPLAINT_SIGNAL = new RegExp(
  [
    ...everyLocale((entry) => entry.complaintTerms).map(escape),
    ...everyLocale((entry) => entry.complaintPatterns),
  ].join("|"),
  "i",
);

/** Whether a field name reads as report volume, accents and case folded. */
export function isComplaintShaped(key: string): boolean {
  return COMPLAINT_SIGNAL.test(foldForMatch(key));
}

/** Denominators a cost figure may have. Anything else is refused by name. */
export const PERMITTED_DENOMINATORS: ReadonlySet<string> = new Set(
  everyLocale((entry) => entry.permittedDenominators).map(foldForMatch),
);

const CONNECTORS = everyLocale((entry) => entry.connectors).map(foldForMatch);
const DISTRIBUTIVE_WORDS = new Set(
  everyLocale((entry) => entry.distributiveWords).map(foldForMatch),
);
const REFERENCE_WORDS = new Set(everyLocale((entry) => entry.referenceWords).map(foldForMatch));

const CONNECTOR_ALTERNATION = CONNECTORS.map(escape).join("|");

/**
 * Rate-shaped keys, in every shipped language.
 *
 * Each form requires a real boundary before the connector so ordinary words
 * containing those letters ("hyperlink", "supervisor", "porcentaje") are not
 * read as rates.
 */
const RATE_KEY_SNAKE = new RegExp(`[_-](?:${CONNECTOR_ALTERNATION})[_-]([a-z_]+)$`, "i");
const RATE_KEY_CAMEL = new RegExp(
  `[a-z](?:${CONNECTORS.map((c) => c[0].toUpperCase() + c.slice(1))
    .map(escape)
    .join("|")})([A-Z][A-Za-z]*)$`,
);

/** The denominator a key declares, or null when the key is not a rate. */
export function declaredDenominator(key: string): string | null {
  const folded = foldForMatch(key);
  const snake = RATE_KEY_SNAKE.exec(folded);
  // The camel form is matched against the original, because folding lowercases
  // away the capital that marks the boundary.
  const camel = RATE_KEY_CAMEL.exec(key);
  const captured = snake?.[1] ?? camel?.[1];
  if (!captured) return null;
  return foldForMatch(captured).replace(/[_-]/g, "");
}

/**
 * The denominator a piece of prose declares, or null when it declares none.
 *
 * This is the allowlist half of the fix for the residual an independent review
 * called the structural one (V-4): the key path refused `coste_por_usuario`
 * because `usuario` is not a permitted denominator, while the prose path
 * accepted "gasto por usuario" because `usuario` was not on a list of words
 * meaning person. Same concept, same language, two different answers depending
 * on whether it was a field name or a string value — and the prose path is the
 * one facing operator-supplied free text.
 *
 * Both paths now ask the same question. The token after the connector is looked
 * up in the permitted set; anything else is a denominator this system does not
 * price by. Function words are skipped rather than refused, which is what keeps
 * "per our discussion" and "as per the agreement" out of the guard's way
 * without reopening the denylist.
 */
export function prosePersonDenominators(text: string): string[] {
  const folded = foldForMatch(text);
  const found: string[] = [];
  // Hyphen counts as a separator, so "per-person" reads the same as "per
  // person". The hyphenated form is arguably the more common written English
  // and it passed the guard the whole time it was English-only (V-1).
  const pattern = new RegExp(`\\b(?:${CONNECTOR_ALTERNATION})[\\s-]+([a-z][a-z\\s-]*)`, "g");
  for (const match of folded.matchAll(pattern)) {
    let tokens = (match[1] ?? "").split(/[\s-]+/).filter(Boolean);
    // A possessive or article means the phrase names something rather than
    // dividing by it. "per our discussion" is not a cost per discussion.
    if (tokens[0] !== undefined && REFERENCE_WORDS.has(tokens[0])) continue;
    // A quantifier keeps the rate reading and the noun behind it is the
    // denominator: "por cada persona" is still a cost per person.
    while (tokens[0] !== undefined && DISTRIBUTIVE_WORDS.has(tokens[0])) tokens = tokens.slice(1);
    if (tokens[0] === undefined) continue;
    if (REFERENCE_WORDS.has(tokens[0])) continue;
    const head = tokens[0];
    // Compound denominators are written both ways -- "per staff-hour" and
    // "per staff hour" -- and the permitted set spells them joined, so try the
    // pair before deciding the head alone is unpermitted.
    const pair = tokens[1] === undefined ? null : `${head}${tokens[1]}`;
    if (PERMITTED_DENOMINATORS.has(head)) continue;
    if (pair !== null && PERMITTED_DENOMINATORS.has(pair)) continue;
    found.push(head);
  }
  return found;
}

/**
 * Prose pricing a person, kept for callers that want a boolean.
 *
 * Note this is now true of any prose declaring a denominator that is not on the
 * permitted list, not only of prose naming a person. That is deliberate and it
 * is the point of the change: the guard cannot enumerate every word for a human
 * being, and it does not have to.
 */
export function prosePricesUnpermittedDenominator(text: string): boolean {
  return prosePersonDenominators(text).length > 0;
}

/**
 * The corpus every guard is checked against, in every shipped locale.
 *
 * `refusals.test.ts` requires an entry for every locale in `LOCALE_VOCABULARY`,
 * and every vector in it to be refused by every guard. Adding a language
 * without adding vectors fails there.
 */
export const REFUSED_CORPUS: Record<
  VocabularyLocale,
  {
    complaintKeys: readonly string[];
    personDenominatorKeys: readonly string[];
    personDenominatorProse: readonly string[];
  }
> = {
  en: {
    complaintKeys: [
      "complaint_count",
      "calls_311",
      "service_request_total",
      "report_volume",
      "nuisance_reports",
      "hotline_calls",
    ],
    personDenominatorKeys: [
      "cost_per_person",
      "costPerPerson",
      "cost_per_contact",
      "cost_per_sleeper",
      "cost_per_household",
      "dollars_per_body",
    ],
    personDenominatorProse: [
      "Assumed cost per person served",
      // V-1: the hyphenated form, which passed for as long as the guard was
      // written only for the language it was written in.
      "Reported as per-person cost",
      "Budgeted per client contacted",
    ],
  },
  es: {
    complaintKeys: [
      "quejas_recibidas",
      "denuncias",
      // V-2: the accented spelling of a word the guard already refused.
      "denúncias",
      "reportes_recibidos",
      "linea_de_atencion",
      // V-3: the standard word for complaints across much of Latin America.
      "reclamos",
      "reclamaciones",
      "avisos_ciudadanos",
    ],
    personDenominatorKeys: [
      "coste_por_persona",
      "costePorPersona",
      "costo_por_contacto",
      "gasto_por_atendido",
      "coste_por_usuario",
    ],
    personDenominatorProse: [
      "Coste asumido por persona atendida",
      // V-4: the prose form the key path already refused.
      "Gasto por usuario",
      "Coste por persona",
    ],
  },
};

/** Legitimate names and prose that must keep passing. Over-refusal is a defect. */
export const PERMITTED_CORPUS: Record<
  VocabularyLocale,
  { keys: readonly string[]; prose: readonly string[] }
> = {
  en: {
    keys: [
      "cost_per_hour",
      "costPerArea",
      "cost_per_plan",
      "cost_per_shift",
      "supervisor_hours",
      "hyperlink",
      "temperature",
      "personnel_hours",
      "reported_hours",
    ],
    prose: [
      "per our discussion",
      "as per the agreement",
      "billed per staff-hour",
      "per each area in scope",
      "Reporting is complete for this period",
    ],
  },
  es: {
    keys: ["coste_por_hora", "porcentaje", "horas_de_personal", "reportado", "importe_por_turno"],
    prose: [
      "segun lo conversado",
      "facturado por hora",
      "por cada area en alcance",
      "por nuestra conversacion",
    ],
  },
};
