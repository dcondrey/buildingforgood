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
 * several call sites. Adding a language here is now one change, and
 * `refusals.test.ts` checks every guard against the same corpus in every
 * shipped locale, so the next language is a checked change rather than a
 * remembered one.
 */

/**
 * Field names carrying report volume. English and Spanish: a Spanish-speaking
 * contractor writing `quejas_recibidas` is doing the ordinary thing in the
 * deployment this product was built for, not attacking it.
 */
export const COMPLAINT_SIGNAL =
  /complaint|311|service_request|call_volume|report_volume|nuisance|hotline|crack_?down|queja|denuncia|reportes_recibidos|reporte_ciudadano|linea_de_atencion|línea_de_atención|molestia/i;

/** Denominators a cost figure may have. Anything else is refused by name. */
export const PERMITTED_DENOMINATORS: ReadonlySet<string> = new Set([
  "hour",
  "hours",
  "hora",
  "horas",
  "staffhour",
  "staffhours",
  "horadepersonal",
  "horasdepersonal",
  "area",
  "areas",
  "área",
  "áreas",
  "plan",
  "plans",
  "planes",
  "shift",
  "shifts",
  "turno",
  "turnos",
]);

/**
 * Rate-shaped keys, in both languages. The allowlist above is
 * language-independent once a key is *recognised* as a rate key, but
 * recognition was keyed on the English word "per": `coste_por_persona` has
 * `_por_`, so the extractor returned null, the key was never treated as a rate,
 * and no check ran at all. Not refused, not allowlisted — invisible.
 *
 * Each form requires a real boundary before per/por so ordinary words
 * containing those letters ("hyperlink", "supervisor", "porcentaje") are not
 * read as rates.
 */
const RATE_KEY_SNAKE = /[_-](?:per|por)[_-]([A-Za-zÁÉÍÓÚÑáéíóúñ_]+)$/i;
const RATE_KEY_CAMEL = /[a-z](?:Per|Por)([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]*)$/;

/** The denominator a key declares, or null when the key is not a rate. */
export function declaredDenominator(key: string): string | null {
  const match = RATE_KEY_SNAKE.exec(key) ?? RATE_KEY_CAMEL.exec(key);
  if (!match?.[1]) return null;
  return match[1].replace(/[_-]/g, "").toLowerCase();
}

/** Prose pricing a person, for string values rather than key names. */
export const PERSON_DENOMINATOR_PROSE =
  /\b(?:per|por)\s+(?:person|people|contact|client|individual|capita|head|resident|participant|sleeper|household|bed|case|enrollee|beneficiary|body|anyone|someone|persona|personas|contacto|cliente|individuo|habitante|atendido|atendida|encuentro|residente|participante|hogar|cama|caso|cuerpo|alguien)\b/i;

/**
 * The corpus every guard is checked against, in every shipped locale.
 * Extend this when a language is added; the suite will name the guard that
 * does not yet refuse it.
 */
export const REFUSED_CORPUS = {
  complaintKeys: [
    "complaint_count",
    "calls_311",
    "service_request_total",
    "report_volume",
    "nuisance_reports",
    "hotline_calls",
    "quejas_recibidas",
    "denuncias",
    "reportes_recibidos",
    "linea_de_atencion",
  ],
  personDenominatorKeys: [
    "cost_per_person",
    "costPerPerson",
    "cost_per_contact",
    "cost_per_sleeper",
    "cost_per_household",
    "dollars_per_body",
    "coste_por_persona",
    "costePorPersona",
    "costo_por_contacto",
    "gasto_por_atendido",
  ],
  personDenominatorProse: ["Assumed cost per person served", "Coste asumido por persona atendida"],
} as const;
