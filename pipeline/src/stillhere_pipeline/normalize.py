"""Deterministic normalization of raw SDRDL count records (issue #6).

Every mapping here is explicit and fail-closed: an unrecognized neighborhood
label, sleeper type, or malformed value is rejected and reported, never
guessed. Original values are preserved on the normalized record so no
transformation is silent.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Literal

SleeperType = Literal["individual", "structure", "vehicle"]

# Canonical neighborhood ids. "core" stopped appearing after 2019-11 and
# "City Center" began 2020-01 with zero overlapping months in the source, so
# they are treated as era aliases of one area. That continuity is an
# ASSUMPTION (the label change may coincide with a boundary redraw) and is
# surfaced machine-readably as a comparability event, never silently.
NEIGHBORHOOD_ALIASES: dict[str, str] = {
    "east_village": "east_village",
    "east_village_south": "east_village_south",
    "gaslamp": "gaslamp",
    "cortez": "cortez",
    "marina": "marina",
    "columbia": "columbia",
    "core": "city_center",
    "City Center": "city_center",
    "Barrio Logan": "barrio_logan",
    "Golden Hill": "golden_hill",
    "Sherman Height": "sherman_heights",
}

# Through 2018-06 the source uses named types; from 2018-07 it uses digit
# annotation codes. The digit mapping is NOT documented in the package README;
# it is inferred from rank consistency (individual dominant, structure second,
# vehicle smallest in both eras) and flagged as an assumption in the quality
# report.
TYPE_ALIASES: dict[str, SleeperType] = {
    "Individual": "individual",
    "Structure": "structure",
    "Vehicle": "vehicle",
    "1": "individual",
    "2": "structure",
    "3": "vehicle",
}

_DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")


class NormalizationError(ValueError):
    """A raw value that no explicit mapping covers."""


@dataclass(frozen=True)
class NormalizedRecord:
    neighborhood: str
    month: str
    type: SleeperType
    count: int
    file_id: str
    source_label: str
    source_date: str
    source_type: str


@dataclass(frozen=True)
class InvalidRow:
    row_number: int
    reason: str


@dataclass(frozen=True)
class NormalizationResult:
    records: list[NormalizedRecord]
    invalid_rows: list[InvalidRow]
    duplicates_dropped: int


def normalize_label(raw: str) -> str:
    try:
        return NEIGHBORHOOD_ALIASES[raw]
    except KeyError:
        raise NormalizationError(f"neighborhood label not in explicit alias map: {raw!r}") from None


def normalize_type(raw: str) -> SleeperType:
    try:
        return TYPE_ALIASES[raw]
    except KeyError:
        raise NormalizationError(f"type not in explicit alias map: {raw!r}") from None


def normalize_month(raw: str) -> str:
    """Truncate to YYYY-MM: the source's day-of-month values are unreliable."""
    match = _DATE_RE.match(raw)
    if match is None:
        raise NormalizationError(f"date not in YYYY-MM-DD form: {raw!r}")
    month = int(match.group(2))
    if not 1 <= month <= 12:
        raise NormalizationError(f"date has out-of-range month: {raw!r}")
    return f"{match.group(1)}-{match.group(2)}"


def _normalize_count(raw: str) -> int:
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise NormalizationError(f"count is not numeric: {raw!r}") from None
    if not math.isfinite(value):
        raise NormalizationError(f"count is not finite: {raw!r}")
    if value < 0:
        raise NormalizationError(f"count is negative: {raw!r}")
    if value != int(value):
        raise NormalizationError(f"count is not an integer: {raw!r}")
    return int(value)


def normalize_records(rows: list[dict[str, str]]) -> NormalizationResult:
    """Normalize raw CSV rows, dropping exact duplicates and rejecting invalid rows.

    Exact duplicates (every raw field identical) are collapsed to one record
    and counted; near-duplicates are kept, since distinct points legitimately
    share a neighborhood, month, and type.
    """
    records: list[NormalizedRecord] = []
    invalid: list[InvalidRow] = []
    seen: set[tuple[str, ...]] = set()
    duplicates = 0

    for row_number, row in enumerate(rows, start=1):
        try:
            # Robust to malformed shapes: csv.DictReader puts overflow fields
            # under a None key and fills short rows with None values, so keys
            # sort by their string form and values stringify.
            key = tuple(f"{k!s}={row[k]!s}" for k in sorted(row, key=str))
            if key in seen:
                duplicates += 1
                continue
            seen.add(key)
            records.append(
                NormalizedRecord(
                    neighborhood=normalize_label(row["neighborhood"]),
                    month=normalize_month(row["date"]),
                    type=normalize_type(row["type"]),
                    count=_normalize_count(row["count"]),
                    file_id=row.get("file_id", ""),
                    source_label=row["neighborhood"],
                    source_date=row["date"],
                    source_type=row["type"],
                )
            )
        except NormalizationError as error:
            invalid.append(InvalidRow(row_number=row_number, reason=str(error)))
        except KeyError as error:
            invalid.append(InvalidRow(row_number=row_number, reason=f"missing column: {error}"))
        except TypeError as error:
            invalid.append(InvalidRow(row_number=row_number, reason=f"malformed row: {error}"))

    return NormalizationResult(records=records, invalid_rows=invalid, duplicates_dropped=duplicates)
