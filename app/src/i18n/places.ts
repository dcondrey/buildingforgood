import type { Translator } from "./context";

/**
 * The place noun this deployment uses, in every form the copy needs.
 *
 * A profile names its own places (`features/shell/deployment.ts` reads the
 * noun out of the profile's scope statement), so the noun is data. Spanish
 * inflects the article, the demonstrative and the quantifier with it, and
 * English does not — so the catalogue carries the whole noun phrase per noun
 * and nothing in the interface glues an article onto a word.
 */
export interface PlaceWords {
  /** "neighborhood" / "barrio" */
  noun: string;
  /** "neighborhoods" / "barrios" */
  nounPlural: string;
  /** "a neighborhood" / "un barrio" */
  a: string;
  /** "some neighborhoods" / "algunos barrios" */
  some: string;
  /** "these neighborhoods" / "estos barrios" */
  these: string;
  /** "six" / "seis" */
  countWord: string;
  /** "the six neighborhoods" / "los seis barrios" */
  counted: string;
  /** "Every one of the 6 neighborhoods" / "Cada uno de los 6 barrios" */
  everyOneOf: string;
}

function camel(noun: string): string {
  return noun.replaceAll(/ (\w)/g, (_, letter: string) => letter.toUpperCase());
}

export function placeWords(t: Translator["t"], noun: string, count: number): PlaceWords {
  const key = `places.${camel(noun)}`;
  const countWord = count >= 0 && count <= 12 ? t(`count.${count}`) : String(count);
  return {
    noun: t(key),
    nounPlural: t(`${key}.plural`),
    a: t(`${key}.a`),
    some: t(`${key}.some`),
    these: t(`${key}.these`),
    countWord,
    counted: t(`${key}.counted`, { count: countWord }),
    everyOneOf: t(`${key}.everyOneOf`, { count }),
  };
}

/** The place params every message that names a place expects. */
export function placeParams(places: PlaceWords): Record<string, string> {
  return {
    areaNoun: places.noun,
    areaNounPlural: places.nounPlural,
    aArea: places.a,
    someAreas: places.some,
    theseAreas: places.these,
    countWord: places.countWord,
    countedAreas: places.counted,
    everyOneOf: places.everyOneOf,
  };
}
