# Verification: SH-1 through SH-4

**Method note.** I deliberately did not test the happy path. Every case below
is one of the failure modes I originally reported, or a new one constructed to
find the edge of the fix. Verifying your own finding is where you are most
likely to accept a plausible patch, so nothing here checks that the
seven-field case works — the existing suite does that.

Harness: `review/attacks/verify-sh.attack.test.ts`. All results **verified**
(executed), not inferred.

---

## SH-2 — **fully fixed.** The strongest of the four.

The decoder now requires all eight fields. I tried to find any omission it
tolerates.

**Single-field omission — 9 parameters, 0 survivors:**

```
V1 drop v          -> null (no plan) — correct, absence of v means "no link here"
V1 drop budget     -> REFUSED (budget: is missing from the link)
V1 drop floor      -> REFUSED
V1 drop guard      -> REFUSED
V1 drop locks      -> REFUSED (locks: is missing from the link)
V1 drop share      -> REFUSED (share: is missing from the link)
V1 drop assume     -> REFUSED (assume: is missing from the link)
V1 drop rate       -> REFUSED (rate: is missing from the link)
V1 drop geography  -> REFUSED
```

**Every pair of omissions — 28 combinations, 0 survivors.**

**Present but malformed — 26 values across all 8 fields, 0 survivors:**
`budget=-1`, `1e3`, `+5`, `" 120"`, `120.0`, `0x78`; `floor=null`;
`guard=ON`, `1`, empty; `locks=east_village:`, `:40`, `east_village:40:8`,
a repeated area, `EAST_VILLAGE:40`; `share=101`, `-5`, `25.5`;
`rate=1e9`, `-1`, `Infinity`, `NaN`; `assume=<script>`, `../../etc`;
`geography=../../x`, `a b`. All refused.

**The two silent defaults are unreachable by omission, and still expressible
when the sender actually chose them** — I checked both directions, because a
fix that made `rate=45` or `share=100` unsendable would have been a different
bug:

```
V4 omit rate  -> REFUSED
V4 omit share -> REFUSED
V4 explicit rate=45 share=1 round-trips: rate=45 share=1
```

The `assume=` empty-string convention (`encodePlanShare` always writes the
parameter, empty when null) is the right call: it makes "the sender had no
clearance assumption" and "the parameter fell off" distinguishable, which was
the whole point of the finding.

**Nothing left open.**

---

## SH-1 — **mostly fixed, two survivors, and one of them is common**

The integration fix is real and is the right shape. `useShellState` now calls
`decodePlanShare` directly, catches `PlanShareError`, stores
`{field, detail}` in `shareRefusal`, and returns before applying anything.
`ShareRefusalNotice` renders it. `PlanShareError.field` is finally consumed.

**16 of 18 manglings now fail visibly**, including all six I originally
reported:

```
truncated at 60 chars          THROWS (visible)
truncated mid-locks            THROWS (visible)
HTML-entity &amp;              THROWS (visible)
trailing period                THROWS (visible)
trailing >                     THROWS (visible)
unicode non-breaking hyphen    THROWS (visible)
trailing comma / ) / ]         THROWS (visible)
trailing newline+space         THROWS (visible)
double-encoded %26             THROWS (visible)
semicolon separators           THROWS (visible)
smart quote appended           THROWS (visible)
zero-width space mid-string    THROWS (visible)
uppercase param names          THROWS (visible)
+ instead of _                 THROWS (visible)
```

### The seventh mangling you asked me to find

```
wrapped in <>          DECODES AS null (silent, no plan)
leading whitespace     DECODES AS null (silent, no plan)
```

**Severity: medium-high.** Both work the same way and both defeat the fix
completely, because they damage the **`v` parameter specifically**:

- `<v=1&budget=…>` — the first parameter's name becomes `<v`, so
  `single(params, "v")` returns `null`, `decodePlanShare` returns `null`
  rather than throwing, and the caller's surviving `if (!shared) return;`
  branch takes over. Default plan, no notice.
- `  v=1&…` — same mechanism, key becomes `"  v"`.

`<https://example.org/…>` is the RFC 3986 appendix C convention for delimiting
a URL in running text, and it is what Outlook, Thunderbird, and most
plain-text mailers do to a bare URL. It is at least as likely as the `&amp;`
case that prompted the original finding.

The structural issue is that `v`-absent is overloaded: it means both "this page
was opened without a link" and "a link arrived but its first parameter was
mangled." Everything else in the decoder throws; only the one parameter that
gates the whole thing degrades to silence.

**Suggested fix** (not applied): trim the search string and strip a matched
`<…>` wrapper before parsing; and treat "no `v`, but one or more of the other
seven known parameters is present" as a refusal rather than as absence. The
second is the general fix and costs three lines.

---

## SH-4 — **fixed, exact-match, correctly conservative**

`geography` carries `profile.geography.area_list.version` and
`assertGeographyMatches` is called at the ingest site before anything is
applied. I tried six ways to defeat it:

```
V6 matching version             ACCEPTED — plan applies
V6 different profile            REFUSED
V6 same profile, older date     REFUSED
V6 same profile, newer date     REFUSED
V6 renamed profile, same areas  REFUSED
V6 case variation               REFUSED
V6 trailing space               REFUSED (shape check)
V6 empty                        REFUSED (shape check)
```

"Renamed profile, same areas" being refused is the right trade: a false refusal
costs a re-send, a false accept costs a wrong plan under the sender's name.

`ShareRefusalNotice` special-cases `field === "geography"`, so the recipient
gets a geography-specific explanation rather than a generic parse error. Good.

### One residual, **inferred** rather than verified

`areaListVersion` comes from `profile.geography.area_list.version` — the
**profile**, not the artifact. Two deployments running the same profile version
against different `demo.v1.json` artifacts would accept each other's links, and
the silent `known.has(areaId)` drop at `useShellState.ts:838` would still apply
to any area the artifact lacks. I did not construct this because it needs two
artifacts, and it is not reachable today with one shipped profile per
geography. Recording it so it is not rediscovered later: **the identifier names
the area list, not the data.**

---

## Summary

| Finding | Verdict | Residual |
| --- | --- | --- |
| SH-2 (silent defaults) | **fixed** | none found across 63 executed cases |
| SH-1 (silent mangling) | **mostly fixed** | `<…>` wrapper and leading whitespace still silent |
| SH-4 (cross-geography) | **fixed** | identifier names the area list, not the artifact (inferred) |
| SH-3 (test naming) | see `review/verify-test-naming-2026-08-23.md` | |
