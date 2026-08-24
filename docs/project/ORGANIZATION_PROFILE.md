# Filling in an organization profile

For the program director or coordinator standing up this tool for their own
organization. No code required. You are filling in one JSON file.

Start by copying `config/profiles/san-diego-downtown.v1.json` to
`config/profiles/<your-org>.v1.json` and working through it top to bottom. The
schema that governs it is `config/schema/organization-profile.v1.schema.json`;
every field below is documented there too.

Two rules before anything else:

- **Never put a person's name, email, phone number, or street address in this
  file.** It ships to the browser. Every "who" field asks for a *role*.
- **If you do not know a value, do not invent one.** Several fields exist
  specifically so you can say "we don't have this yet, and here is why." Saying
  so is the correct answer, and the interface will show it.

---

## 1. Identity — who this profile is for

| Field | Required | What to put |
| --- | --- | --- |
| `schema_version` | yes | Leave it at `organization-profile/v1`. |
| `profile_id` | yes | A short lowercase slug for your deployment, words joined by hyphens: `riverside-county-outreach`. |
| `profile_status` | yes | `draft` while you are still filling it in — this marks the profile as not for real decisions. Change to `adopted` when your leadership signs off. |
| `last_updated` | yes | Today's date, as `2026-08-23`. Update it every time you change anything. |
| `organization.name` | yes | Your organization, as you want it to appear on screen. |
| `organization.profile_owner_role` | yes | The **job title** accountable for these numbers, e.g. `Director of Outreach Programs`. Not a person. |
| `organization.scope_statement` | yes | One or two sentences an outsider can read: what this deployment covers and what it does not. This is shown in the interface, so write it the way you would write it for a funder. |
| `organization.jurisdiction_note` | no | Anything else a reader needs about the jurisdiction — that your areas cross two counties, that one is served under a different contract. |

## 2. Observations — the privacy posture

| Field | Required | What to put |
| --- | --- | --- |
| `observations.grain` | yes | `area_month_aggregate`. It is the only accepted value. |
| `observations.precise_locations_publishable` | yes | `false`. It is the only accepted value. |
| `observations.individual_records_publishable` | yes | `false`. It is the only accepted value. |

These are fixed, not defaults. They are in the file so that a reader can see
the posture stated, and so that any attempt to relax it is a visible edit that
fails to load rather than a quiet change of behaviour.

## 3. Geography — your areas, and where they came from

This is the section that takes real work, and it is the section an evaluator
will read hardest.

### 3a. The area list

| Field | Required | What to put |
| --- | --- | --- |
| `geography.area_list.version` | yes | A label for this exact set of area names, e.g. `county-service-areas/2026-07`. Change it whenever you add, remove, or rename an area, so a plan can always be traced back to the geography it was made under. |
| `geography.area_list.areas[].id` | yes | A stable lowercase identifier, words joined by underscores: `north_bench`. Never rename an id in place — a rename is a new area list version. |
| `geography.area_list.areas[].label` | yes | How the area is named to a human, spelled the way your source spells it: `North Bench`. |
| `geography.area_list.areas[].in_scope` | yes | `true` if this area receives hours; `false` if it does not. |
| `geography.area_list.areas[].note` | no | Why an area is out of scope, or any caveat about comparing it with the others. |

**List areas you do not plan against, marked `in_scope: false`.** It is
tempting to just leave them out. Don't. An area missing from the file is
invisible; an area listed and excluded is a decision someone can question.

### 3b. Provenance — the honest part

Three things in this section each carry their own `provenance` block:
`area_list` (where the **names** come from), `boundaries` (where the **lines
between them** come from), and `adjacency` (which areas **touch** which).

They are separate because publishers routinely name their areas without
publishing their geometry, and a profile that treats those as one thing claims
more than it knows.

Each block asks for:

| Field | Required | What to put |
| --- | --- | --- |
| `resolution_status` | yes | One of the four below. |
| `source_name`, `publisher`, `source_url`, `source_version`, `retrieved_at` | when `resolved` | The document, who published it, a direct link, its edition or date, and the date you downloaded it. All five, or the status is not `resolved`. |
| `resolution_note` | for every status except `resolved` | Plain sentences, written for someone outside your organization, saying what is missing and why. **This is the text the interface displays as a disclosure.** |
| `resolution_rule` | yes, always | What would change the status. Even a `resolved` entry needs one: what would force you to re-check it. |

The four statuses:

- **`resolved`** — you can name a source, cite a version, and say when you got
  it. The file will not accept this status with any of those left blank.
- **`provisional`** — you have a working definition your organization uses, but
  you cannot yet cite it. A boundary your outreach supervisor drew is
  provisional, not resolved. Say who drew it in the note.
- **`unresolved`** — there is no defensible source, and you are saying so. This
  is a legitimate, publishable answer. The tool shows the note and behaves more
  cautiously: without adjacency, for instance, the displacement test returns
  "insufficient evidence" instead of guessing.
- **`illustrative`** — this describes a place that does not exist. Only for
  teaching examples.

> **Do not write a version string to make an unresolved field look filled in.**
> That is the single failure this schema exists to prevent. The reference San
> Diego profile marks its area names `resolved` with a real citation, and marks
> its boundaries and adjacency `unresolved` with the reason, because that is
> the truth.

### 3c. Adjacency

| Field | Required | What to put |
| --- | --- | --- |
| `geography.adjacency.version` | yes | A label for the table, or `null` if adjacency is unresolved. |
| `geography.adjacency.pairs` | yes | A list of two-area pairs that share a border: `[["north_bench", "pine_hollow"]]`. List each pair once — the tool treats them as mutual. Every id must appear in your area list. `[]` if you have none. |
| `geography.adjacency.provenance` | yes | As above. |

If adjacency is `unresolved`, `pairs` must be empty and `version` must be
`null`. The file will not load otherwise. An adjacency table nobody can cite
would let the interface claim displacement evidence it does not have.

## 4. Operations — what you have and how you spend it

| Field | Required | What to put |
| --- | --- | --- |
| `operations.planning_horizon.value` / `.unit` / `.label` | yes | How far ahead one plan reaches, in days, plus what you call it locally — `next scheduled outreach shift`, `next two-week cycle`. |
| `operations.budget.value` | yes | Total **staff hours** available across that whole horizon. Two staff for eight hours is sixteen staff hours. This is the number the coordinator sees before they change anything. |
| `operations.budget.user_editable` | yes | `true` if the coordinator may change it on screen. Almost always true. |
| `operations.budget.minimum` / `.maximum` | minimum yes | The range the interface will accept. `0` for the minimum unless you have a reason; the maximum is optional. |
| `operations.shift.length_hours` | yes | Length of one team's shift. |
| `operations.shift.allocation_increment_hours` | yes | The smallest block the planner may assign to an area. One hour suits a compact downtown. If your teams drive forty minutes between areas, set two or four — a one-hour assignment two counties away is not a real instruction. |
| `operations.team_count` | yes | How many teams can be in the field at once. A **team**, not a headcount: two people in one van are one team. |
| `operations.coverage_floor_hours` | yes | See below. |
| `operations.continuity_reserve_hours` | yes | See below. |
| `operations.uncertainty_weight` | yes | See below. |
| `operations.floor_dominance_warning_threshold` | no | Defaults to `0.25`. See below. |

### The coverage floor

**The most consequential number in the file.** It is the minimum hours every
in-scope area receives before any forecast-driven distribution happens. It is
what stops a quiet area from being zeroed out because a model said so.

Set it by asking: what is the smallest visit to one area that is worth
sending a team on at all? In a dense downtown that might be four to eight
hours. In a sevenArea county where an area is forty minutes away, a visit under ten
hours may not be worth the drive.

Then check the arithmetic: **floor × number of in-scope areas** is committed
before the forecast is consulted at all. Six areas at eight hours commits
forty-eight of an eighty-hour budget. If the floor exceeds the budget, the file
will not load — every plan it could produce would be infeasible. If it leaves
less than `floor_dominance_warning_threshold` of the budget discretionary, you
get a warning: below that line the floor, not the forecast, is deciding the
plan, and the interface has to say so rather than present it as
forecast-driven.

### The continuity reserve

Extra hours added for an area whose evidence came back "possible displacement."
An apparent decline that might be displacement is a reason to keep showing up,
not a reason to leave. Set it to the smallest amount that makes a return visit
real. Check that floor + reserve across all areas still fits inside the budget
in the worst case where every area is flagged.

### The uncertainty weight

How much a wide forecast interval raises an area's share. `0` plans purely
against the upper bound. Higher values give more time to the areas the model
understands least, so uncertainty does not turn into neglect. `0.5` is the
shipped reference. If your areas are small and your counts jump around, `0.75`
or `1` is defensible — write down why you chose it.

## 5. Cost assumptions

| Field | Required | What to put |
| --- | --- | --- |
| `cost_assumptions.loaded_hourly_rate.value` | yes | Your fully loaded cost of one outreach staff hour. |
| `...currency` | yes | Three-letter code, `USD`. |
| `...unit` | yes | `cost_per_staff_hour`. Only accepted value. |
| `...assumption.status` | yes | `operator_set_assumption`. Only accepted value — this rate is something you assert, not something anyone measured. |
| `...assumption.set_by_role` | yes | The role that set it: `Finance Director`. Not a person. |
| `...assumption.basis` | yes | One plain sentence saying where the number came from: `FY26 approved budget, outreach personnel line divided by budgeted field hours`. An auditor reads this first. |
| `...assumption.effective_date` | yes | When the rate took effect. |
| `...assumption.review_by` | no | When it should be revisited. Strongly recommended: a cost assumption with no review date quietly becomes a claim. |
| `...assumption.includes` | yes | What the rate covers — wages, payroll taxes, benefits, supervision, vehicle. |
| `...assumption.excludes` | yes | What it deliberately leaves out — client assistance funds, capital, indirect administration. |

`includes` and `excludes` are required because "loaded rate" means different
things at different organizations, and a cost figure whose contents are
unstated is not comparable to anything. Any number the tool computes from this
rate must be shown as resting on it.

## 6. Language boundaries

| Field | Required | What to put |
| --- | --- | --- |
| `language_boundaries.permitted_examples` | yes | Sentences your organization is willing to stand behind, in your own voice. These set the ceiling on what the tool asserts. |
| `language_boundaries.prohibited_claim_types` | yes | Claim types the interface must never make. |

Five entries are mandatory in every profile and the file will not load without
them:

- `identified_people_moved_between_areas`
- `policy_caused_observed_decline`
- `area_needs_enforcement`
- `live_shelter_capacity_or_eligibility`
- `automatic_operational_authorization`

You may add more. You may not remove these.

## 7. Optional extras

| Field | What to put |
| --- | --- |
| `review_triggers` | Events that should send a coordinator back to review a plan — a new monthly observation, a changed budget, a seasonal road closure. Rendered as a checklist. |
| `notes` | Free text for readers of the file. Not shown as evidence. |

---

## What you cannot put in this file

There is no field for complaint volume, 311 calls, service requests, or any
other count of reports received. There is no way to add one: the schema is
closed, and the loader rejects any property name that looks like one, naming
the field it found.

This is not an oversight and it is not negotiable in configuration. Complaint
volume measures who complains, not who is present. Areas with organized,
well-resourced residents generate more reports per person present than areas
without. Letting that reach an allocation is the single most likely
well-intentioned change that would break what this tool is for — which is why
it is blocked at the type level, at the schema level, and at the loader, rather
than trusted to review.

Those three blocks all match field *names*, so they do not amount to a claim
that complaint volume can never influence a plan. That broader claim was
tested by an independent review and falsified. What the project claims is
narrower: complaint volume cannot reach allocation without also corrupting the
published forecast interval, which is derived from checksummed inputs. The
arithmetic that holds that line is the `planning_load` derivation check in
`pipeline/src/stillhere_pipeline/contracts.py`, not the name checks above. See
`docs/project/DECISIONS.md`.

There is likewise no field for a person, a household, a case, a coordinate, a
block, or an address. The observation grain is area-month aggregate and the
schema cannot express anything finer.

## Checking your work

From the repository root:

```sh
cd app && npx vitest run src/domain/config
```

The shipped example profiles are validated by that suite. To check your own
file, add it alongside them and load it with `parseOrganizationProfile` from
`app/src/domain/config`; it throws with the offending field named, like:

```
Invalid organization profile at `geography.boundaries.provenance.resolution_note`:
Required and non-empty when resolution_status is `unresolved`. This is the text
the interface renders as an unresolved-provenance disclosure. Say what is
missing and why.
```

Errors stop the file loading. Warnings do not — a floor that leaves little
discretionary budget, or a budget that is not a whole number of shifts, are
flagged for you to look at, not blocked.

## An example that is not San Diego

`config/profiles/san-diego-dsdp-seven.v1.json` is an illustrative profile for
a fictional sevenArea continuum of care: eight in-scope areas plus one listed and
excluded, a 132-hour budget over a fourteen-day cycle, a ten-hour coverage
floor, two-hour allocation blocks, and a self-drawn adjacency table. It exists
to show what the same tool looks like configured somewhere that is not a dense
downtown. Every value in it is invented; do not cite any of them.
