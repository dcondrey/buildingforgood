"""Deployable-data privacy boundary (issue #7).

Nothing that could locate or identify a person may reach the static
deployment. This module is the structural enforcement of that promise: it
scans generated artifacts and the production bundle, and fails the build on
any violation rather than relying on reviewer attention.

Four rule families, in the order they were derived:

1. **Forbidden keys** — coordinate, address, parcel, and record-identifier
   field names, matched on a normalized key so ``Latitude``, ``lat_deg`` and
   ``geo-lat`` all resolve to the same rule.
2. **Forbidden value patterns** — street addresses, coordinate pairs, and
   plus codes appearing inside otherwise innocent string fields.
3. **Coordinate geometry** — the hard case. The product ships an aggregate
   spatial view, so boundary polygons are *legitimate* coordinates. Numbers
   are therefore permitted only inside a ``geometry`` of type ``Polygon`` or
   ``MultiPolygon``; ``Point``, ``MultiPoint`` and ``LineString`` geometries
   are refused outright, as is any bare coordinate-shaped number elsewhere.
   A deny-list without this exemption either blocks the map or is theatre.
4. **Small-cell suppression** — added by the C-01 red-team review (finding
   R-06). Aggregation is not anonymization: a neighbourhood-month count of
   one is a person. Counts below the threshold must be published as
   suppressed, never as a number.

The scan is intentionally noisy about ambiguity. A finding at ``BLOCK``
severity fails the build; ``WARN`` is reported and does not.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# --- Rule data -------------------------------------------------------------

#: Field names that may never appear in a deployable artifact, normalized to
#: lowercase alphanumerics (so ``geo-lat``, ``geoLat`` and ``geo_lat`` match).
FORBIDDEN_KEYS: frozenset[str] = frozenset(
    {
        # coordinates
        "lat",
        "latdeg",
        "latitude",
        "lon",
        "lng",
        "long",
        "londeg",
        "longitude",
        "geolat",
        "geolon",
        "easting",
        "northing",
        "pointx",
        "pointy",
        "geox",
        "geoy",
        "coords",
        "coordinate",
        "coordinates",
        "latlng",
        "latlon",
        "geohash",
        "pluscode",
        "what3words",
        "utm",
        "mgrs",
        # addresses and parcels
        "address",
        "address1",
        "address2",
        "streetaddress",
        "fulladdress",
        "addr",
        "street",
        "streetname",
        "housenumber",
        "blockaddress",
        "crossstreet",
        "apn",
        "parcel",
        "parcelid",
        "parcelnumber",
        "zipplus4",
        # person and record identifiers
        "personid",
        "clientid",
        "individualid",
        "hmisid",
        "caseid",
        "clientkey",
        "rawrecordid",
        "sourcerecordid",
        "servicerequestid",
        "incidentid",
        "ssn",
        "dob",
        "dateofbirth",
        "firstname",
        "lastname",
        "fullname",
        "phone",
        "phonenumber",
        "email",
        "emailaddress",
        # site-level identifiers
        "pointid",
        "siteid",
        "campid",
        "encampmentid",
        "tentid",
        "structureid",
    }
)

#: Substrings that make a key forbidden regardless of surrounding tokens.
FORBIDDEN_KEY_SUBSTRINGS: tuple[str, ...] = (
    "latitude",
    "longitude",
    "geohash",
    "pluscode",
    "streetaddress",
)

#: Keys that mark an object as a *cell* — one area, one period. Any small
#: integer inside such an object is a published cell value, whatever it is
#: named. Detecting cells by context rather than by guessing count-field
#: names is deliberate: the first version of this rule looked for names like
#: ``count`` and ``observed``, and missed 306 real small cells in the A-07
#: artifact because that schema names them ``total``, ``individual``,
#: ``structure`` and ``vehicle``. Context is stable; field names are not.
CELL_CONTEXT_KEYS: frozenset[str] = frozenset(
    {"month", "period", "date", "yearmonth", "neighborhood", "areaid", "area", "observations"}
)

#: Keys inside a cell whose small integers are structural, not observations.
CELL_NUMERIC_ALLOWLIST: frozenset[str] = frozenset(
    {
        "schemaversion",
        "version",
        "year",
        "day",
        "quarter",
        "index",
        "rank",
        "horizonperiods",
        "periods",
        "months",
        "seasonalperiods",
        "weight",
        "timeincrement",
        "increment",
        "minimumsustainedperiods",
        # Structural fields that legitimately sit inside a cell. Kept
        # deliberately narrow: `order`, `sequence` and `priority` were here
        # and have been removed, because each is a plausible name for a real
        # count ({"priority": 2} meaning two flagged individuals), and an
        # allow-list entry is an exemption. Narrow exemptions, not scanning.
        "revision",
        "sortindex",
        # Unambiguously temporal. A schema encoding month as 3 is naming a
        # period, not counting three people.
        "month",
        "period",
        "date",
        "yearmonth",
    }
)
# Deliberately NARROW. `area`, `areaid`, `neighborhood` and `observations`
# are cell-context keys but are NOT exempt, because an integer under those
# names is genuinely ambiguous: `{"observations": 3}` is as likely a count as
# a label. An earlier version unioned CELL_CONTEXT_KEYS in wholesale and
# recreated exactly the name-based false negative this rule was rewritten to
# eliminate. A privacy gate resolves ambiguity by blocking, so an integer
# identifier will fail the scan and should be published as a string — which
# the real observations artifact already does (`"neighborhood": "barrio_logan"`).

#: Sibling markers that make a small count legitimate, because it is already
#: declared as suppressed rather than published.
SUPPRESSION_MARKERS: frozenset[str] = frozenset(
    {"suppressed", "issuppressed", "redacted", "isredacted"}
)

#: Geometry types the product is allowed to publish. Aggregate areas only.
ALLOWED_GEOMETRY_TYPES: frozenset[str] = frozenset({"Polygon", "MultiPolygon"})

#: San Diego bounding box. A decimal number inside the longitude span is very
#: nearly unambiguous; the latitude span overlaps plausible counts and metrics,
#: so latitude alone is only a warning unless a longitude accompanies it.
SD_LON_RANGE: tuple[float, float] = (-117.7, -116.5)
SD_LAT_RANGE: tuple[float, float] = (32.4, 33.6)

#: Minimum decimal places before a number is treated as coordinate-shaped.
COORDINATE_DECIMALS = 3

STREET_ADDRESS_RE = re.compile(
    r"\b\d{1,6}\s+(?:[NSEW]\.?\s+)?[A-Za-z][\w.'-]*(?:\s+[A-Za-z][\w.'-]*){0,3}\s+"
    r"(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|"
    r"Pl|Place|Way|Ter|Terrace|Pkwy|Parkway|Hwy|Highway|Cir|Circle)\b\.?",
    re.IGNORECASE,
)
COORD_PAIR_RE = re.compile(r"-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}")
PLUS_CODE_RE = re.compile(r"\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b")

#: Raw-data extensions that must never be published, whatever they contain.
FORBIDDEN_PUBLISHED_SUFFIXES: frozenset[str] = frozenset(
    {".csv", ".tsv", ".xlsx", ".xls", ".shp", ".dbf", ".parquet", ".db", ".sqlite"}
)

#: Text assets in the production bundle that are worth scanning.
BUNDLE_SUFFIXES: frozenset[str] = frozenset({".js", ".mjs", ".cjs", ".css", ".html", ".map"})


# --- Findings --------------------------------------------------------------


@dataclass(frozen=True)
class Finding:
    """One privacy rule violation, located precisely enough to fix."""

    severity: str  # "BLOCK" or "WARN"
    rule: str
    where: str
    detail: str

    def render(self) -> str:
        return f"[{self.severity}] {self.rule}\n    at {self.where}\n    {self.detail}"


def normalize_key(key: str) -> str:
    """Reduce a field name to lowercase alphanumerics for rule matching."""
    return re.sub(r"[^a-z0-9]", "", key.lower())


def _decimal_places(value: float) -> int:
    text = repr(float(value))
    if "e" in text or "E" in text or "." not in text:
        return 0
    return len(text.split(".", 1)[1].rstrip("0"))


def _looks_like_longitude(value: float) -> bool:
    return (
        SD_LON_RANGE[0] <= value <= SD_LON_RANGE[1]
        and _decimal_places(value) >= COORDINATE_DECIMALS
    )


def _looks_like_latitude(value: float) -> bool:
    return (
        SD_LAT_RANGE[0] <= value <= SD_LAT_RANGE[1]
        and _decimal_places(value) >= COORDINATE_DECIMALS
    )


# --- JSON traversal --------------------------------------------------------


def _scan_string(value: str, where: str) -> Iterator[Finding]:
    if STREET_ADDRESS_RE.search(value):
        yield Finding("BLOCK", "value.street_address", where, f"street address in {value!r}")
    if COORD_PAIR_RE.search(value):
        yield Finding("BLOCK", "value.coordinate_pair", where, f"coordinate pair in {value!r}")
    if PLUS_CODE_RE.search(value):
        yield Finding("BLOCK", "value.plus_code", where, f"plus code in {value!r}")


def _scan_geometry(node: dict[str, Any], where: str) -> Iterator[Finding]:
    """Check a GeoJSON-shaped geometry object and consume its coordinates."""
    geometry_type = node.get("type")
    if not isinstance(geometry_type, str) or geometry_type not in ALLOWED_GEOMETRY_TYPES:
        yield Finding(
            "BLOCK",
            "geometry.type_not_aggregate",
            where,
            f"geometry type {geometry_type!r} is not an aggregate area; "
            f"only {sorted(ALLOWED_GEOMETRY_TYPES)} may be published",
        )
        return
    coords = node.get("coordinates")
    max_precision = _max_coordinate_precision(coords)
    if max_precision > 6:
        yield Finding(
            "WARN",
            "geometry.excess_precision",
            f"{where}.coordinates",
            f"boundary vertices carry {max_precision} decimal places; "
            "6 (~0.1 m) is already beyond what an aggregate boundary needs",
        )


def _max_coordinate_precision(node: Any) -> int:
    if isinstance(node, (int, float)) and not isinstance(node, bool):
        return _decimal_places(float(node))
    if isinstance(node, list):
        return max((_max_coordinate_precision(item) for item in node), default=0)
    return 0


def is_cell_context(node: dict[str, Any]) -> bool:
    """True when this object identifies one area and/or one period."""
    return any(normalize_key(k) in CELL_CONTEXT_KEYS for k in node)


#: Values that count as an affirmative suppression declaration. Anything
#: else — False, None, 0, "no" — means the cell is published.
SUPPRESSION_TRUE_VALUES: frozenset[str] = frozenset({"true", "yes", "1", "suppressed", "redacted"})


def is_suppressed(node: dict[str, Any]) -> bool:
    """True when this object affirmatively declares itself suppressed.

    Presence of the key is not enough. ``{"suppressed": false}`` is a common
    explicit encoding for *published*, and treating it as suppressed would
    exempt the cell — and, since suppression propagates, every breakdown
    under it — from the rule this module exists to enforce. A privacy gate
    fails closed: only an affirmative value suppresses.
    """
    for key, value in node.items():
        if normalize_key(key) not in SUPPRESSION_MARKERS:
            continue
        if value is True or value == 1:
            # `1` covers pandas- and SQL-derived JSON, which serializes
            # booleans as integers. `0` and `False` stay unsuppressed.
            return True
        if isinstance(value, str) and value.strip().lower() in SUPPRESSION_TRUE_VALUES:
            return True
    return False


def _scan_counts(node: dict[str, Any], where: str, min_cell: int) -> Iterator[Finding]:
    """Flag published cell values small enough to identify a person (R-06)."""
    for key, value in node.items():
        norm = normalize_key(key)
        if norm in CELL_NUMERIC_ALLOWLIST:
            continue
        if isinstance(value, bool) or not isinstance(value, int):
            continue
        if 0 < value < min_cell:
            yield Finding(
                "BLOCK",
                "smallcell.unsuppressed_count",
                f"{where}.{key}",
                f"published value {value} in an area/period cell is below the small-cell "
                f"threshold of {min_cell}; publish it as suppressed instead of as a number. "
                "If this is an identifier rather than an observation, publish it as a string.",
            )


def _scan_json(
    node: Any,
    where: str,
    min_cell: int,
    *,
    in_geometry: bool = False,
    in_cell: bool = False,
    suppressed: bool = False,
    in_list: bool = False,
) -> Iterator[Finding]:
    if isinstance(node, dict):
        # A geometry approval covers its own ``coordinates`` payload and
        # nothing else. Letting it cover the whole object exempted siblings
        # from the numeric coordinate check, so a raw longitude parked next
        # to an approved polygon escaped entirely. Same mirror-image flaw as
        # cell scope and suppression: scope must follow the thing it approved.
        geometry_here = False
        if not in_geometry and "coordinates" in node and "type" in node:
            yield from _scan_geometry(node, where)
            geometry_here = True
        cell_scope = in_cell or is_cell_context(node)
        # Suppression covers the whole cell, nested breakdowns included, so an
        # observation marked suppressed is not re-flagged through its own
        # by_type object. It must NOT cross into a separate record: a node
        # that names its own area or period, or that sits as a list element,
        # is a different cell and re-evaluates its own markers. Inheriting
        # across that boundary let a suppressed 2021-09 cell silently exempt
        # an unsuppressed 2021-08 count nested under it. Narrowing what
        # inherits suppression only ever scans more, which is the safe
        # direction; narrowing what gets scanned is what caused the last bug.
        own_record = is_cell_context(node) or in_list
        cell_suppressed = is_suppressed(node) if own_record else (suppressed or is_suppressed(node))
        if cell_scope and not cell_suppressed:
            yield from _scan_counts(node, where, min_cell)
        for key, value in node.items():
            child = f"{where}.{key}"
            norm = normalize_key(key)
            # ``coordinates`` is the payload of a geometry we have already
            # approved as an aggregate area, so the key deny-list must not
            # fire on it there. Everywhere else it stays forbidden.
            exempt = (in_geometry or geometry_here) and norm == "coordinates"
            if not exempt and (
                norm in FORBIDDEN_KEYS or any(s in norm for s in FORBIDDEN_KEY_SUBSTRINGS)
            ):
                yield Finding(
                    "BLOCK",
                    "key.forbidden_field",
                    child,
                    f"field name {key!r} is on the deny-list",
                )
            # Cell scope propagates to EVERY descendant, unconditionally.
            # An earlier version gated this on the child being a pure numeric
            # breakdown, to stop false blocks on a config object nested in a
            # cell. That silently exempted a breakdown containing a further
            # breakdown -- by_type: {individual: 2, by_severity: {...}} -- so
            # real small counts were never scanned at any depth below it.
            # Over-blocking is the acceptable error direction here; a silent
            # miss is not. Noise is reduced by naming structural keys in
            # CELL_NUMERIC_ALLOWLIST, never by narrowing what gets scanned.
            child_geometry = in_geometry or (geometry_here and norm == "coordinates")
            yield from _scan_json(
                value,
                child,
                min_cell,
                in_geometry=child_geometry,
                in_cell=cell_scope,
                suppressed=cell_suppressed,
            )
        return

    if isinstance(node, list):
        for index, item in enumerate(node):
            yield from _scan_json(
                item,
                f"{where}[{index}]",
                min_cell,
                in_geometry=in_geometry,
                in_cell=in_cell,
                suppressed=suppressed,
                in_list=True,
            )
        return

    if isinstance(node, str):
        yield from _scan_string(node, where)
        return

    if isinstance(node, (int, float)) and not isinstance(node, bool):
        if in_geometry:
            return
        value = float(node)
        if _looks_like_longitude(value):
            yield Finding(
                "BLOCK",
                "value.longitude_like",
                where,
                f"{value} falls in the San Diego longitude span with "
                f"{_decimal_places(value)} decimal places",
            )
        elif _looks_like_latitude(value):
            yield Finding(
                "WARN",
                "value.latitude_like",
                where,
                f"{value} falls in the San Diego latitude span with "
                f"{_decimal_places(value)} decimal places; confirm it is not a coordinate",
            )


def scan_json_document(document: Any, where: str = "$", min_cell: int = 5) -> list[Finding]:
    """Scan one parsed JSON document and return every finding."""
    return list(_scan_json(document, where, min_cell))


# --- File and directory scans ---------------------------------------------


def scan_generated_dir(directory: Path, min_cell: int = 5) -> list[Finding]:
    """Scan every published artifact under ``public/generated`` (or equivalent)."""
    findings: list[Finding] = []
    if not directory.is_dir():
        return [
            Finding(
                "WARN",
                "scan.directory_missing",
                str(directory),
                "generated-artifact directory does not exist yet; nothing published to check",
            )
        ]
    for path in sorted(p for p in directory.rglob("*") if p.is_file()):
        if path.suffix.lower() in FORBIDDEN_PUBLISHED_SUFFIXES:
            findings.append(
                Finding(
                    "BLOCK",
                    "publish.raw_file_type",
                    str(path),
                    f"{path.suffix} files are raw or tabular sources and must not be deployed",
                )
            )
            continue
        if path.suffix.lower() != ".json":
            continue
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
            findings.append(
                Finding("BLOCK", "scan.unreadable_artifact", str(path), f"cannot parse: {error}")
            )
            continue
        findings.extend(scan_json_document(document, where=str(path), min_cell=min_cell))
    return findings


def scan_bundle_dir(directory: Path) -> list[Finding]:
    """Scan the built production bundle, source maps included."""
    findings: list[Finding] = []
    if not directory.is_dir():
        return [
            Finding(
                "WARN",
                "scan.bundle_missing",
                str(directory),
                "production bundle not built; run the app build before release verification",
            )
        ]
    for path in sorted(p for p in directory.rglob("*") if p.is_file()):
        if path.suffix.lower() in FORBIDDEN_PUBLISHED_SUFFIXES:
            findings.append(
                Finding(
                    "BLOCK",
                    "publish.raw_file_type",
                    str(path),
                    f"{path.suffix} file present in the production bundle",
                )
            )
            continue
        if path.suffix.lower() not in BUNDLE_SUFFIXES:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError as error:
            findings.append(
                Finding("BLOCK", "scan.unreadable_bundle", str(path), f"cannot read: {error}")
            )
            continue
        for match in COORD_PAIR_RE.finditer(text):
            findings.append(
                Finding(
                    "BLOCK",
                    "bundle.coordinate_pair",
                    str(path),
                    f"coordinate pair {match.group(0)!r} embedded in the bundle",
                )
            )
        for match in STREET_ADDRESS_RE.finditer(text):
            findings.append(
                Finding(
                    "BLOCK",
                    "bundle.street_address",
                    str(path),
                    f"street address {match.group(0)!r} embedded in the bundle",
                )
            )
        for quoted in re.finditer(r"[\"']([A-Za-z_][A-Za-z0-9_-]{2,40})[\"']\s*:", text):
            norm = normalize_key(quoted.group(1))
            if norm in FORBIDDEN_KEYS or any(s in norm for s in FORBIDDEN_KEY_SUBSTRINGS):
                findings.append(
                    Finding(
                        "BLOCK",
                        "bundle.forbidden_field",
                        str(path),
                        f"deny-listed field {quoted.group(1)!r} embedded in the bundle",
                    )
                )
    return findings


def scan_publication_layout(root: Path) -> list[Finding]:
    """Confirm raw and processed data cannot be published by directory layout."""
    findings: list[Finding] = []
    public_dir = root / "public"
    for name in ("raw", "processed"):
        stray = public_dir / "data" / name
        if stray.exists():
            findings.append(
                Finding(
                    "BLOCK",
                    "layout.raw_inside_public",
                    str(stray),
                    f"data/{name} must live outside the published directory",
                )
            )
    for name in ("raw", "processed"):
        gitignore = root / "data" / name / ".gitignore"
        if (root / "data" / name).is_dir() and not gitignore.is_file():
            findings.append(
                Finding(
                    "WARN",
                    "layout.unignored_data_dir",
                    str(root / "data" / name),
                    f"data/{name} has no .gitignore; source files can be committed by accident",
                )
            )
    return findings


# --- CLI -------------------------------------------------------------------


def run_scan(root: Path, generated: Path, bundle: Path, min_cell: int) -> list[Finding]:
    findings = scan_publication_layout(root)
    findings.extend(scan_generated_dir(generated, min_cell))
    findings.extend(scan_bundle_dir(bundle))
    return findings


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m stillhere_pipeline.privacy",
        description="Fail the build if deployable data could locate or identify a person (#7).",
    )
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--generated", type=Path, default=None)
    parser.add_argument("--bundle", type=Path, default=None)
    parser.add_argument("--min-cell", type=int, default=5)
    parser.add_argument(
        "--require-bundle",
        action="store_true",
        help="treat a missing production bundle as a failure (use in release verification)",
    )
    args = parser.parse_args(argv)

    root: Path = args.root
    generated: Path = args.generated or root / "public" / "generated"
    bundle: Path = args.bundle or root / "app" / "dist"

    findings = run_scan(root, generated, bundle, args.min_cell)
    blocking = [f for f in findings if f.severity == "BLOCK"]
    warnings = [f for f in findings if f.severity == "WARN"]

    if args.require_bundle:
        missing = [f for f in warnings if f.rule == "scan.bundle_missing"]
        blocking.extend(missing)
        warnings = [f for f in warnings if f.rule != "scan.bundle_missing"]

    for finding in warnings:
        print(finding.render(), file=sys.stderr)
    for finding in blocking:
        print(finding.render(), file=sys.stderr)

    print(
        f"privacy scan: {len(blocking)} blocking, {len(warnings)} warning "
        f"(generated={generated}, bundle={bundle}, min_cell={args.min_cell})"
    )
    if blocking:
        print("PRIVACY SCAN FAILED", file=sys.stderr)
        return 1
    print("PRIVACY SCAN PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
