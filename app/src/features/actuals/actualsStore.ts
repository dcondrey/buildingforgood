/**
 * Where a loaded actuals file lives between visits: this browser, and nowhere
 * else.
 *
 * The raw text is stored, never the parsed document. Reading it back runs it
 * through `ingestActuals` again from the beginning, so a hand-edited storage
 * entry gets the same refusal a hand-edited file would. Storing the validated
 * object would have made local storage a way past the guard, which is the
 * whole reason the guard is on the ingest path rather than on the file input.
 *
 * The profile id is stored beside the text so a file loaded under one
 * deployment is not silently re-read under another; the loader checks it too,
 * and this only avoids showing a refusal the user cannot act on.
 */

export const ACTUALS_STORE_KEY = "stillhere-actuals-v1";

export interface StoredActuals {
  profileId: string;
  fileName: string;
  text: string;
}

export function readStoredActuals(): StoredActuals | null {
  try {
    const raw = localStorage.getItem(ACTUALS_STORE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const entry = parsed as Partial<StoredActuals>;
    if (typeof entry.profileId !== "string") return null;
    if (typeof entry.fileName !== "string") return null;
    if (typeof entry.text !== "string") return null;
    return { profileId: entry.profileId, fileName: entry.fileName, text: entry.text };
  } catch {
    return null;
  }
}

export function writeStoredActuals(entry: StoredActuals | null): void {
  try {
    if (entry === null) localStorage.removeItem(ACTUALS_STORE_KEY);
    else localStorage.setItem(ACTUALS_STORE_KEY, JSON.stringify(entry));
  } catch {
    // Without storage the screen still works for this session.
  }
}
