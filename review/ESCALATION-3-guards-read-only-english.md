# ESCALATION 3 — three refusal guards read only English, and the app now ships Spanish

**RESOLVED 2026-08-23 in `280cabf`.** One shared bilingual vocabulary now
sits behind every guard, and a locale added without refusal vectors breaks
the build. Re-verified 2026-08-23: the same defect was found and fixed
again on the actuals import path, which did not exist when this was
raised. Its "Status: OPEN" below is historical.

**Raised:** 2026-08-23, during the post-i18n re-falsification (queue 3.2)
**Condition met:** *any refusal guard bypassable*
**Status:** OPEN
**Harness:** `review/attacks/spanish-guard.attack.test.ts` — all results executed

---

## The finding

`a10f371` is titled *"Spanish, and the discovery that a guard reading only
English stops guarding."* That discovery was correct and was acted on in two
places. It was not swept across the other three.

| Guard | English complaint | **Spanish complaint** | English per-person | **Spanish per-person** |
| --- | --- | --- | --- | --- |
| `domain/actuals/actuals.ts` | refuses | **refuses** | — | — |
| `features/export/planCsv.ts` | refuses | **refuses** | refuses | **refuses** |
| `domain/planner/planner.ts` | refuses | **ACCEPTS** | — | — |
| `features/share/planShareState.ts` | refuses | **ACCEPTS** | — | — |
| `domain/cost/cost.ts` | — | — | refuses | **ACCEPTS** |

Executed results:

```
G2 EN complaint_count                 REFUSED
G2 EN 311_calls                       REFUSED
G2 ES quejas_recibidas                ACCEPTED      <- assertNoComplaintSignal
G2 ES denuncias                       ACCEPTED
G2 ES reportes_recibidos              ACCEPTED
G2 ES linea_de_atencion               ACCEPTED

G3 area id complaint_ward             REFUSED
G3 area id quejas_centro              ACCEPTED      <- into a share link
G3 area id denuncias_norte            ACCEPTED
G3 area id reportes_recibidos_sur     ACCEPTED
G3 area id linea_de_atencion_este     ACCEPTED

G1 EN key  cost_per_person            REFUSED
G1 ES key  coste_por_persona          ACCEPTED      <- assertNoPersonDenominator
G1 ES key  costo_por_contacto         ACCEPTED
G1 ES key  costePorPersona            ACCEPTED
G1 EN val  'per person served'        REFUSED
G1 ES val  'por persona atendida'     ACCEPTED
```

`assertNoComplaintSignal` is the primary refusal guard of this project — the
one F-7 was raised about, the one the README, the decision contract, and the
board brief all rest on. In Spanish it does not fire.

## Why the cost guard fails, specifically

This one is worth spelling out because the E-3 allowlist fix was good and this
is not a regression in it.

`cost.ts:49-50` extracts the denominator from a key before checking it:

```ts
const RATE_KEY_SNAKE = /[_-]per[_-]([A-Za-z_]+)$/i;
const RATE_KEY_CAMEL  = /[a-z]Per([A-Z][A-Za-z]*)$/;
```

The allowlist is language-independent *once a key is recognised as a rate key*.
But recognition is keyed on the English word **"per"**. `coste_por_persona`
contains `_por_`, not `_per_`, so the extractor returns `null`, the key is not
treated as a rate key at all, and **no check runs** — it is not refused and it
is not allowlisted, it is invisible.

`PERSON_DENOMINATOR_PROSE` (`cost.ts:53-54`) has the same shape: `\bper\s+…`.

`planCsv.ts:49-51` already carries the bilingual version of both patterns —
`por[_-](persona|personas|contacto|cliente|…)` and the Spanish report-volume
tokens. **The correct pattern exists in this repository and was not
propagated.**

## Severity, stated fairly

The payload has to be *named* in Spanish. That is not an exotic attack — it is
the ordinary case in the deployment this feature was built for. A
Spanish-speaking contractor at a Spanish-language deployment naming a field
`quejas_recibidas` is not attacking anything; they are writing normal code in
their own language. The guard exists precisely to stop the well-meaning
version, and against the well-meaning Spanish version it does nothing.

This is not a case where the type system catches it either:
`ComplaintShapedKeysOf<T>` mirrors `COMPLAINT_FIELD_PATTERN` and is equally
English-only.

## What I checked that held

So the fix is scoped, not sweeping:

- **`actuals.ts` is fully bilingual and is the model to copy.** Every Spanish
  case was refused, including complaint intent inside the free-text
  `engagement_measure.definition` — which is the hardest of them, because it is
  operator-supplied prose the project never sees:
  ```
  G4 ES key quejas_por_area             REFUSED
  G4 ES label 'quejas recibidas'        REFUSED
  G4 ES definition 'denuncias'          REFUSED
  ```
- `planCsv.ts` carries both bilingual patterns.
- The English side of all five guards is intact — no regression.

## Suggested fix

Not applied, and the shape is the build session's call. The obvious move:
extract the four patterns into one shared module with one vocabulary, imported
by all five guards, so a new language is added once rather than five times. A
test that asserts every guard refuses the same corpus in every shipped locale
would make the next language a checked change rather than a remembered one.

The deeper point, offered once: this is the third time a guarantee has held in
the place it was written and not in the place it was needed — F-1 (guard on the
unshipped planner), E-4 (`Map` walked at one call site), and now this. The
common factor is that each guard is a local copy of a policy rather than one
policy with several call sites.
