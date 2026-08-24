# Verification: Escalation 3 closure, and SH-1's last two survivors

**Reviewed at `280cabf`.** Re-ran my original harnesses unchanged, then probed
past both my test list and theirs.

**Verdict: Escalation 3 closed. SH-1 closed, better than I specified. Five
residuals in the new vocabulary, none escalation-grade.**

---

## Escalation 3 — **closed, verified on all 24 original vectors**

`review/attacks/spanish-guard.attack.test.ts`, unchanged from the version that
raised the escalation. Every one of the eleven that previously passed now
refuses:

```
G1 ES key  coste_por_persona          REFUSED   (was ACCEPTED)
G1 ES key  costo_por_contacto         REFUSED   (was ACCEPTED)
G1 ES key  costePorPersona            REFUSED   (was ACCEPTED)
G1 ES val  'por persona atendida'     REFUSED   (was ACCEPTED)
G2 ES quejas_recibidas                REFUSED   (was ACCEPTED)
G2 ES denuncias                       REFUSED   (was ACCEPTED)
G2 ES reportes_recibidos              REFUSED   (was ACCEPTED)
G2 ES linea_de_atencion               REFUSED   (was ACCEPTED)
G3 area id quejas_centro              REFUSED   (was ACCEPTED)
G3 area id denuncias_norte            REFUSED   (was ACCEPTED)
G3 area id reportes_recibidos_sur     REFUSED   (was ACCEPTED)
```

English side intact, no regression.

**The structural fix is the right one and I want to be specific about why.**
`app/src/domain/vocabulary/refusedTerms.ts` is now imported by all five guards
*and* by the compile-time key chain, and the type-level list is generated from
the same array rather than hand-chained. That last detail is what makes it
durable: the previous arrangement could drift between the runtime regex and
`ComplaintShapedKeysOf<T>` silently, and now it cannot. Adding a language is one
edit in one file.

Also verified: extracting the vocabulary did not move the guard out of scope.
Injecting a complaint identifier into `lib/planner.ts` still fails the refusal
suite.

## **Zero over-refusals** — the half that could have gone wrong

A vocabulary sweep is as likely to break legitimate keys as to catch bad ones,
so I tested the other direction on eleven plausible names:

```
cost_per_hour · coste_por_hora · costPerArea · cost_per_plan · cost_per_shift
porcentaje · supervisor_hours · hyperlink · temperature · personnel_hours
operational_notes ("per our discussion")
                                        all accepted — 0 over-refusals
```

`porcentaje` and `supervisor_hours` are the two that would have caught a naive
substring fix. They pass. Good.

---

## Five residuals — reported, not escalated

All are the same class: **the key path is an allowlist and is closed by
construction; the prose path is still a denylist and has edges.**

That distinction is worth making precisely, because it is the same lesson one
level up. `custo_por_pessoa` (Portuguese), `coste_por_día`, and
`coste_por_usuario` are all **refused** — not because those words are on a list,
but because the extractor recognises `X_por_Y`, looks `Y` up in the permitted
denominators, doesn't find it, and refuses. That is the right design and it
closes an infinite space. The residuals below are all cases where either the
extractor doesn't engage, or the check isn't the allowlist.

### V-1 — `per-person cost` passes the prose check (**English**)

```
H5 "per-person cost"                 accepted
H5 "cost per person served"          REFUSED
```

`PERSON_DENOMINATOR_PROSE` requires whitespace after `per`/`por` (`\bper\s+…`).
The hyphenated form — arguably the *more* common written English — slips
through. This is the one I'd fix first: it is a miss in the language the guard
was always written for, found only because the Spanish sweep prompted a re-probe.

### V-2 — accent handling is inconsistent

```
H2 denuncias                REFUSED
H2 denúncias                accepted     <- same word, accented
H2 línea_de_atención        REFUSED      <- accented, and caught
```

Some terms survive accents and some don't, which means the fix is matching
literal strings rather than normalising. `String.prototype.normalize("NFD")` and
stripping combining marks before matching would close the whole class rather
than the instances.

### V-3 — three real Spanish complaint terms missing

```
H2 reclamos             accepted
H2 reclamaciones        accepted
H2 avisos_ciudadanos    accepted
H4 reclamos_sur         accepted   (as a share-link area id)
H4 avisos_este          accepted
```

`reclamos` is the standard word for complaints across much of Latin America and
is used interchangeably with `quejas`; `avisos ciudadanos` is what Mexico City's
311 equivalent calls them. If the Spanish build is aimed at a US Spanish-speaking
population, `reclamos` in particular belongs in the list.

### V-4 — the prose path is weaker than the key path for the same word

```
coste_por_usuario   (key)    REFUSED   <- allowlist: 'usuario' not permitted
"gasto por usuario" (prose)  accepted  <- denylist: 'usuario' not listed
```

Same concept, same language, two different answers depending on whether it is a
field name or a string value. Since `actuals/v1` carries operator-supplied free
text that this project never sees, the prose path is the one facing untrusted
input. **Suggested fix: invert it.** Extract the noun after `per`/`por` in prose
the same way the key extractor does, and refuse anything not on the permitted
list. That makes both paths allowlists and retires this whole category.

### V-5 — other connectors do not engage the extractor (**scope note, not a defect today**)

```
H3 cout_par_personne    accepted   (French 'par')
H3 kosten_pro_person    accepted   (German 'pro')
```

Only `per` and `por` are recognised as rate-key connectors, so for any other
language the allowlist never engages — the same failure mode as the original
`coste_por_persona` bug, one language further out. **Not a live issue**: only
English and Spanish ship. Recording it because the fix is to add the connector
when the language is added, and that is easy to forget precisely because the
vocabulary file will look like the only thing that needs touching.

---

## SH-1 — **closed, and better than I specified**

I re-ran all 18 manglings. Three now decode rather than throw, which my harness
initially flagged as "silent, possibly wrong." **That label was wrong and I am
correcting it**: I wrote the classifier when a decoded plan from a mangled link
meant the *default* plan. I checked what they actually produce:

```
R1 wrapped in <>              RECOVERED sender's plan exactly
R1 leading whitespace         RECOVERED sender's plan exactly
R1 trailing newline+space     RECOVERED sender's plan exactly
R1 both: < + whitespace       RECOVERED sender's plan exactly
R1 <> with ? prefix           RECOVERED sender's plan exactly
R1 mismatched < only          refused: "v: is missing, but the link still carries…"
R1 mismatched > only          refused: geography shape check
```

Byte-identical to the sent state in all five recoverable cases, and the
unrecoverable ones refuse with the message I suggested. **This is a better
outcome than the fix I proposed** — I asked for the ambiguous case to be refused;
they made the unambiguous cases recover and refused only what genuinely cannot
be recovered. A coordinator whose mail client wrapped the URL in angle brackets
now gets the right plan rather than a correct error.

The general fix — "no `v` but other known share parameters present is damage,
not absence" — is the one that closes the class rather than the instances.

---

## Summary

| Item | Verdict |
| --- | --- |
| Escalation 3, 24 original vectors | **closed**, verified |
| Type layer generated from the same array | **verified**, and the durable part |
| Guard still in scope after extraction | **verified** (injection still fails the suite) |
| Over-refusal on 11 legitimate keys | **none** |
| V-1 `per-person` hyphenated prose (English) | **open** — fix first |
| V-2 accent normalisation inconsistent | open |
| V-3 `reclamos`, `reclamaciones`, `avisos_ciudadanos` | open |
| V-4 prose path is a denylist where the key path is an allowlist | open — the structural one |
| V-5 `par`/`pro` connectors | not live; add with the language |
| SH-1 remaining survivors | **closed**, with exact recovery |
