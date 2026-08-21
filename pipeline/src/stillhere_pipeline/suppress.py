"""Small-cell suppression for published observation cells (R-06).

Aggregation is not anonymization: a neighborhood-month count of one is a
person. Before an observation row is published, every count 0 < v below the
threshold is suppressed to null, and suppression is COMPLEMENTARY: if exactly
one cell in a row would be suppressed, the next-smallest nonzero cell joins
it. Zeros are publishable (they identify nobody) and totals below the
threshold suppress the whole row.

Complementary partners alone are NOT sufficient (adversarial review finding):
when two cells are small no partner fires, and a suppressed remainder of 2
across two nonzero cells pins both at exactly 1. So every published row also
passes an explicit ATTACKER-MODEL check: enumerate every assignment of values
to the suppressed cells that is consistent with the public policy and the
published numbers; if any cell's value, or even the value multiset, is unique
across that feasible set, the whole row escalates to suppressed. The feasible
set is small by construction (small cells are bounded by the threshold), so
enumeration is exact, not sampled.

The threshold must match the privacy scanner's ``min_cell`` (PR #44,
``stillhere_pipeline/privacy.py``); consolidate into one shared constant when
both are merged.
"""

from __future__ import annotations

from itertools import product
from typing import Any

SMALL_CELL_THRESHOLD = 5


def _feasible_assignments(k: int, remainder: int) -> list[tuple[int, ...]]:
    """Every value assignment an attacker must consider for k suppressed cells.

    Policy-consistent families, both public knowledge:
    - all suppressed cells were small (each in 1..threshold-1), any k >= 2;
    - exactly one small cell plus its complementary partner (partner is
      nonzero and at least the threshold, else it would itself be small),
      which the policy produces only for k == 2, in either position.
    """
    upper = SMALL_CELL_THRESHOLD - 1
    assignments: set[tuple[int, ...]] = set()
    if k >= 2:
        for combo in product(range(1, upper + 1), repeat=k):
            if sum(combo) == remainder:
                assignments.add(combo)
    if k == 2:
        for small in range(1, upper + 1):
            partner = remainder - small
            if partner >= SMALL_CELL_THRESHOLD:
                assignments.add((small, partner))
                assignments.add((partner, small))
    return sorted(assignments)


def _row_is_recoverable(suppressed_count: int, remainder: int) -> bool:
    """True when the published row would pin a suppressed value.

    Pinned means: across the feasible set, some position always holds the
    same value (exact cell recovery), or all assignments share one value
    multiset (the attacker learns every suppressed value, only not which
    type holds which).
    """
    assignments = _feasible_assignments(suppressed_count, remainder)
    if not assignments:
        # No consistent story exists; publishing would itself be anomalous.
        return True
    for position in range(suppressed_count):
        if len({a[position] for a in assignments}) == 1:
            return True
    multisets = {tuple(sorted(a)) for a in assignments}
    return len(multisets) == 1


def suppress_observation_row(observation: dict[str, Any]) -> dict[str, Any]:
    """Return a publishable copy of one observation row.

    Input shape: ``{"month": str, "total": int, "by_type": {type: int}}``.
    Output is either the whole-row suppressed form
    ``{"month": ..., "total": None, "suppressed": True}`` or a published row
    whose small cells (plus a complementary partner when needed) are null,
    listed under ``by_type_suppressed``.
    """
    month = observation["month"]
    total = observation["total"]
    by_type = observation["by_type"]

    if 0 < total < SMALL_CELL_THRESHOLD:
        return {"month": month, "total": None, "suppressed": True}

    suppressed = {name for name, value in by_type.items() if 0 < value < SMALL_CELL_THRESHOLD}
    if not suppressed:
        return {"month": month, "total": total, "by_type": dict(by_type)}

    if len(suppressed) == 1:
        partners = sorted(
            (value, name) for name, value in by_type.items() if name not in suppressed and value > 0
        )
        if partners:
            suppressed.add(partners[0][1])
        else:
            # No nonzero partner exists, so the row total IS the small cell;
            # unreachable when total >= threshold, but fail closed regardless.
            return {"month": month, "total": None, "suppressed": True}

    remainder = sum(value for name, value in by_type.items() if name in suppressed)
    if _row_is_recoverable(len(suppressed), remainder):
        return {"month": month, "total": None, "suppressed": True}

    published = {name: (None if name in suppressed else value) for name, value in by_type.items()}
    return {
        "month": month,
        "total": total,
        "by_type": published,
        "by_type_suppressed": sorted(suppressed),
    }
