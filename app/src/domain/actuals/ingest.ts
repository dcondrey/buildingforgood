/**
 * The one door an actuals file comes in through.
 *
 * `validateActuals` checks the file against its schema and its privacy
 * contract. This wraps it in the guard that the planner puts on its own
 * inputs, `assertNoComplaintSignal`, and it does so on the raw parsed JSON —
 * before any structural check, so a complaint-shaped field is refused whether
 * or not the rest of the file is well formed.
 *
 * The duplication is on purpose. `validateActuals` refuses an unknown field by
 * name because the schema is closed, which already stops a complaint field at
 * the top level; but "the schema is closed" is a property somebody can relax
 * in one edit, and the refusal that must not be relaxed is the other one. This
 * function makes the shared guard a property of the ingest path itself rather
 * than a side effect of the schema being strict this week. Nothing else in the
 * app reads an actuals file, and nothing should: a second reader is a second
 * door.
 *
 * It also never throws. A refusal is a finding with a field name on it, in the
 * same list as every other finding, because a screen that shows one failure at
 * a time makes an operator fix a file one round trip at a time.
 */

import { assertNoComplaintSignal } from "../planner/planner.ts";
import { validateActuals, type ActualsValidationOptions } from "./actuals.ts";
import type { ActualsValidation } from "./types.ts";

export interface ActualsIngestResult extends ActualsValidation {
  /** True when the file was refused by the shared complaint-signal guard. */
  refusedForComplaintSignal: boolean;
}

/** Parse, guard, and validate one actuals file's text. Never throws. */
export function ingestActuals(
  text: string,
  options: ActualsValidationOptions = {},
): ActualsIngestResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    return {
      ok: false,
      document: null,
      errors: [{ field: "(document)", message: `Not valid JSON: ${(cause as Error).message}` }],
      warnings: [],
      refusedForComplaintSignal: false,
    };
  }
  return ingestParsedActuals(parsed, options);
}

/** The same path, for a value that has already been parsed. */
export function ingestParsedActuals(
  parsed: unknown,
  options: ActualsValidationOptions = {},
): ActualsIngestResult {
  try {
    assertNoComplaintSignal(parsed, "actuals file");
  } catch (cause) {
    return {
      ok: false,
      document: null,
      errors: [{ field: "(document)", message: (cause as Error).message }],
      warnings: [],
      refusedForComplaintSignal: true,
    };
  }
  return { ...validateActuals(parsed, options), refusedForComplaintSignal: false };
}
