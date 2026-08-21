"""Small-cell suppression for published observation cells (R-06).

Aggregation is not anonymization: a neighborhood-month count of one is a
person. Before an observation row is published, every count 0 < v below the
threshold is suppressed to null, and suppression is COMPLEMENTARY: if exactly
one cell in a row would be suppressed, the next-smallest nonzero cell joins
it, so no suppressed value is ever exactly recoverable by subtracting the
published values from the published total. Zeros are publishable (they
identify nobody) and totals below the threshold suppress the whole row.

The threshold must match the privacy scanner's ``min_cell`` (PR #44,
``stillhere_pipeline/privacy.py``); consolidate into one shared constant when
both are merged.
"""

from __future__ import annotations

from typing import Any

SMALL_CELL_THRESHOLD = 5


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

    published = {name: (None if name in suppressed else value) for name, value in by_type.items()}
    return {
        "month": month,
        "total": total,
        "by_type": published,
        "by_type_suppressed": sorted(suppressed),
    }
