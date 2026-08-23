"""Monthly refresh: audit inputs, attach currency metadata, emit the artifact.

This is the command a human runs once a month. It is deliberately *not*
scheduled automation: every run is initiated, read, and accepted by a person.

The run is a straight line with no degraded exit. Any failed pin, any failed
audit, any contract or privacy violation aborts before a single byte is
written, so a stale-but-honest artifact is never replaced by a fresh-looking
wrong one.

Three input modes:

``--source bundle``
    Rebuild the artifact from the organizer bundle in ``data/raw``. Requires
    the participant files, which are not in the repository (finding F-2).

``--source fixture``
    Read a committed synthetic base artifact and monitoring table. Works from
    a clean checkout with no network and no bundle; this is what the golden
    test exercises.

``--source published``
    Re-derive currency for the artifact that is already published, without
    rebuilding it. Everything the currency block needs is already in the
    repository: ``generated_from.source_data_through`` from the artifact
    itself, the tracked monitoring transcription, and the clock.

    This mode is weaker than ``bundle`` and says so: it does **not** re-verify
    the artifact against the raw inputs, because those inputs are not in the
    repository. It therefore refuses to change any analytical value — the
    document it writes must be byte-identical to the one it read except for
    the ``currency`` key, and it aborts if that is not true. Use it to answer
    "what does this say about this month" when a full rebuild is not
    available; use ``bundle`` when it is.

Run from the repository root::

    PYTHONPATH=pipeline/src python -m stillhere_pipeline.refresh --source fixture
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from copy import deepcopy
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from stillhere_pipeline.contracts import ContractViolation, validate_demo_v1
from stillhere_pipeline.demo import DemoBuildError, build_demo_document
from stillhere_pipeline.privacy import scan_json_document

CURRENCY_KEY = "currency"
MONITORING_DEFAULT = Path("data/monitoring/dsdp_public_checkpoints.csv")
MONITORING_SOURCE_PREFIX = "data/raw/dsdp_public_reports/"
FIXTURE_DEFAULT = Path("tests/pipeline/fixtures/refresh")
FIXTURE_BASE_FILE = "demo_base.v1.json"
FIXTURE_MONITORING_FILE = "dsdp_public_checkpoints.csv"
CHECKSUM_FILE = "checksums.sha256"
CARDS_DEFAULT = Path("data/cards")
RAW_DEFAULT = Path("data/raw/hackathon_provided")
OUT_DEFAULT = Path("public/generated/demo.v1.json")
PUBLISHED_DEFAULT = Path("public/generated/demo.v1.json")

DEFAULT_CADENCE_MONTHS = 1
DEFAULT_STALENESS_THRESHOLD_MONTHS = 2

PERIMETER_GEOGRAPHY = "Outside Perimeter"
AREA_SERIES = "area_total"
CORE_SERIES = "six_area_core_total"
PUBLISHED_SERIES = "seven_area_total"

# Organizer inputs the bundle mode rebuilds from, in the order fetch_raw.sh
# lists them. Pins live in data/cards/checksums.sha256 under these paths.
BUNDLE_INPUTS = (
    "Area_Crosswalk.csv",
    "BlockLevel_Counts.csv",
    "BlockLevel_Counts_Panel261.csv",
    "DowntownCounts_Monthly.csv",
    "Methodology_Periods.csv",
)

# Verbatim from data/monitoring/README.md. Nothing here is inferred: each
# ground is a sentence the monitoring README already commits to, and the
# promotion rule is its update-protocol rule 5.
EXCLUSION_REASON: dict[str, Any] = {
    "summary": (
        "These are public monitoring checkpoints that postdate the frozen analytical "
        "snapshot. They are not model inputs and do not change the historical forecast "
        "replay or the planner."
    ),
    "grounds": [
        "DSDP moved to an irregular quarterly cadence in late 2025.",
        "2026 counts were run dually on paper and a piloted application.",
        "At least one 2026 count was redone with differing results.",
        (
            "The 2026 count months themselves are contested: the DSDP dashboard labels "
            "1,092 as “Q1 2026,” while the source PDF places that value in April "
            "and supplies no January–March observation."
        ),
        (
            "The values are multiplier-adjusted visual observations—estimated "
            "person-equivalents, not unique people, verified service needs, or program "
            "outcomes."
        ),
    ],
    "promotion_rule": (
        "Keep every row model_eligible=false. Promotion into training or planning "
        "requires a separate, documented model-version decision."
    ),
    "source": "data/monitoring/README.md",
}

# The lineage names data/cards/source_ledger.yaml already uses for this
# exclusion. Reusing them keeps the artifact and the ledger in one vocabulary.
EXCLUDED_FROM = (
    "demo_v1_training",
    "demo_v1_forecast_selection",
    "demo_v1_planner",
)

SOURCE_PUBLICATION_NOTE = (
    "DSDP moved to an irregular quarterly cadence in late 2025 and does not announce "
    "publication dates in advance; the month in this block is this project's own "
    "refresh cadence, not a publisher commitment."
)


class RefreshError(RuntimeError):
    """The refresh cannot proceed. Nothing is written when this is raised."""


@dataclass(frozen=True)
class MonitoringRow:
    month: str
    series: str
    geography: str
    value: int
    unit: str
    value_status: str
    source_id: str

    def as_json(self) -> dict[str, Any]:
        return {
            "month": self.month,
            "series": self.series,
            "geography": self.geography,
            "value": self.value,
            "unit": self.unit,
            "value_status": self.value_status,
            "source_id": self.source_id,
            "model_eligible": False,
        }


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load_pins(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise RefreshError(f"no checksum ledger at {path}; cannot verify inputs")
    pins: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        digest, _, name = line.partition("  ")
        pins[name.strip()] = digest.strip()
    return pins


def verify_pins(inputs: dict[str, Path], pins: dict[str, str]) -> dict[str, str]:
    """Verify every input against its pin. Returns the verified digests."""
    verified: dict[str, str] = {}
    problems: list[str] = []
    for key, path in sorted(inputs.items()):
        if not path.is_file():
            problems.append(f"missing input {key} (expected at {path})")
            continue
        if key not in pins:
            problems.append(f"no pinned checksum for {key}; re-pin before refreshing")
            continue
        digest = _sha256(path)
        if digest != pins[key]:
            problems.append(f"checksum mismatch for {key}: pinned {pins[key]}, got {digest}")
            continue
        verified[Path(key).name] = digest
    if problems:
        raise RefreshError("input verification failed:\n  - " + "\n  - ".join(problems))
    return verified


def _present_pinned_documents(prefix: str, pins: dict[str, str]) -> dict[str, Path]:
    """Pinned publisher documents that are on disk right now.

    ``data/raw`` is gitignored, so absence is normal on a clean checkout and
    is not an error. Presence without a matching pin is, and falls through to
    ``verify_pins``.
    """
    return {key: Path(key) for key in pins if key.startswith(prefix) and Path(key).is_file()}


def _month(raw: str) -> str:
    text = raw.strip()
    if len(text) >= 7 and text[4] == "-":
        return text[:7]
    raise RefreshError(f"unparseable report month {raw!r}")


def _shift_month(month: str, delta: int) -> str:
    year, mon = int(month[:4]), int(month[5:7])
    index = year * 12 + (mon - 1) + delta
    return f"{index // 12:04d}-{index % 12 + 1:02d}"


def _months_between(start: str, end: str) -> int:
    return (int(end[:4]) * 12 + int(end[5:7])) - (int(start[:4]) * 12 + int(start[5:7]))


def load_monitoring_rows(path: Path) -> list[MonitoringRow]:
    """Read the monitoring table, refusing anything marked model-eligible."""
    if not path.is_file():
        raise RefreshError(f"monitoring table not found at {path}")
    with path.open(newline="", encoding="utf-8") as handle:
        raw_rows = list(csv.DictReader(handle))
    if not raw_rows:
        raise RefreshError(f"monitoring table {path} has no rows")
    rows: list[MonitoringRow] = []
    for index, raw in enumerate(raw_rows, start=2):
        eligible = (raw.get("model_eligible") or "").strip().lower()
        if eligible != "false":
            raise RefreshError(
                f"{path} line {index}: model_eligible is {eligible!r}, expected 'false'. "
                "Monitoring rows are observed-not-model-eligible by protocol; promotion "
                "requires a documented model-version decision, not a refresh."
            )
        try:
            value = int((raw.get("value") or "").strip())
        except ValueError:
            raise RefreshError(f"{path} line {index}: value is not an integer") from None
        rows.append(
            MonitoringRow(
                month=_month(raw.get("report_month") or ""),
                series=(raw.get("series") or "").strip(),
                geography=(raw.get("geography") or "").strip(),
                value=value,
                unit=(raw.get("unit") or "").strip(),
                value_status=(raw.get("value_status") or "").strip(),
                source_id=(raw.get("source_id") or "").strip(),
            )
        )
    return rows


def audit_monitoring(rows: list[MonitoringRow]) -> None:
    """Apply the monitoring README's reconciliation rule to every month.

    Rule 4 of the update protocol: each derived core total must reconcile to
    the publisher's total plus Outside Perimeter.
    """
    problems: list[str] = []
    by_month: dict[str, list[MonitoringRow]] = {}
    for row in rows:
        by_month.setdefault(row.month, []).append(row)
    for month in sorted(by_month):
        month_rows = by_month[month]
        areas = [r for r in month_rows if r.series == AREA_SERIES]
        published = [r for r in month_rows if r.series == PUBLISHED_SERIES]
        core = [r for r in month_rows if r.series == CORE_SERIES]
        if len(published) != 1 or len(core) != 1:
            problems.append(
                f"{month}: expected exactly one {PUBLISHED_SERIES} and one {CORE_SERIES} row"
            )
            continue
        perimeter = [r for r in areas if r.geography == PERIMETER_GEOGRAPHY]
        if len(perimeter) != 1:
            problems.append(f"{month}: expected exactly one {PERIMETER_GEOGRAPHY!r} area row")
            continue
        area_sum = sum(r.value for r in areas)
        if area_sum != published[0].value:
            problems.append(
                f"{month}: area rows sum to {area_sum} but the published total is "
                f"{published[0].value}"
            )
        expected_core = published[0].value - perimeter[0].value
        if core[0].value != expected_core:
            problems.append(
                f"{month}: core total {core[0].value} does not reconcile to the published "
                f"total minus {PERIMETER_GEOGRAPHY} ({expected_core})"
            )
    if problems:
        raise RefreshError("monitoring reconciliation failed:\n  - " + "\n  - ".join(problems))


def build_currency(
    *,
    source_data_through: str,
    as_of: date,
    generated_at: str,
    mode: str,
    inputs: dict[str, str],
    monitoring_rows: list[MonitoringRow],
    cadence_months: int,
    staleness_threshold_months: int,
) -> dict[str, Any]:
    as_of_month = as_of.strftime("%Y-%m")
    elapsed = _months_between(source_data_through, as_of_month)
    is_stale = elapsed > staleness_threshold_months
    if is_stale:
        reason = (
            f"Source data runs through {source_data_through}; {elapsed} months have elapsed "
            f"as of {as_of_month}, past the {staleness_threshold_months}-month freshness "
            "threshold."
        )
    else:
        reason = (
            f"Source data runs through {source_data_through}; {elapsed} months have elapsed "
            f"as of {as_of_month}, within the {staleness_threshold_months}-month freshness "
            "threshold."
        )
    months = sorted({row.month for row in monitoring_rows})
    units = sorted({row.unit for row in monitoring_rows if row.unit})
    source_ids = sorted({row.source_id for row in monitoring_rows if row.source_id})
    return {
        "as_of": as_of.isoformat(),
        "generated_at": generated_at,
        "source_data_through": source_data_through,
        "status": "stale" if is_stale else "current",
        "is_stale": is_stale,
        "staleness": {
            "elapsed": {"months": elapsed},
            "threshold": {"months": staleness_threshold_months},
            "reason": reason,
        },
        "next_publication_expected": {
            "month": _shift_month(as_of_month, cadence_months),
            "cadence": {"months": cadence_months},
            "basis": "this project's monthly operator refresh cadence",
            "source_publication_scheduled": False,
            "source_publication_note": SOURCE_PUBLICATION_NOTE,
        },
        "refresh": {
            "mode": mode,
            "pins_verified": True,
            "inputs": dict(sorted(inputs.items())),
        },
        "observed_not_model_eligible": {
            "status": "observed_not_model_eligible",
            "headline": (
                "Observed after the frozen source window and deliberately excluded from "
                "every model and planner input."
            ),
            "months": months,
            "unit": units[0] if len(units) == 1 else None,
            "source_ids": source_ids,
            "excluded_from": list(EXCLUDED_FROM),
            "exclusion_reason": dict(EXCLUSION_REASON),
            "rows": [row.as_json() for row in monitoring_rows],
        },
    }


def assert_monitoring_isolated(document: dict[str, Any]) -> None:
    """Structural proof that no monitoring month reaches a model input.

    The rows live under ``currency`` only. This re-reads the assembled
    document rather than trusting the assembly, so a future edit that copies
    a monitoring month into the observation or forecast lane fails here.
    """
    currency = document.get(CURRENCY_KEY)
    if not isinstance(currency, dict):
        raise RefreshError("currency block is missing from the assembled artifact")
    lane = currency.get("observed_not_model_eligible")
    if not isinstance(lane, dict):
        raise RefreshError("currency.observed_not_model_eligible is missing")
    rows = lane.get("rows")
    if not isinstance(rows, list) or not rows:
        raise RefreshError("currency.observed_not_model_eligible.rows must be non-empty")
    if any(row.get("model_eligible") is not False for row in rows):
        raise RefreshError("every monitoring row must carry model_eligible=false")

    excluded_months = {str(row.get("month")) for row in rows}
    observations = document.get("observations", {})
    history_months = {
        str(row.get("month")) for row in observations.get("history", []) if isinstance(row, dict)
    }
    latest_months = {
        str(row.get("month"))
        for row in observations.get("latest_by_area", [])
        if isinstance(row, dict)
    }
    missing_months = {str(month) for month in observations.get("missing_months", [])}
    forecast = document.get("forecast", {})
    forecast_months = {
        str(forecast.get("target_month")),
        str(forecast.get("data_frozen_through")),
    }
    for label, seen in (
        ("observations.history", history_months),
        ("observations.latest_by_area", latest_months),
        ("observations.missing_months", missing_months),
        ("forecast", forecast_months),
    ):
        leaked = sorted(excluded_months & seen)
        if leaked:
            raise RefreshError(
                f"model-ineligible months {leaked} reached {label}; monitoring "
                "checkpoints must never enter a model or planner input"
            )


def _privacy_gate(document: dict[str, Any]) -> None:
    blocking = [f for f in scan_json_document(document, where="$") if f.severity == "BLOCK"]
    if blocking:
        raise RefreshError(
            "privacy scan blocked the refreshed artifact:\n"
            + "\n".join(finding.render() for finding in blocking)
        )


def _load_base_document(path: Path) -> dict[str, Any]:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RefreshError(f"cannot read base artifact {path}: {error}") from None
    if not isinstance(loaded, dict):
        raise RefreshError(f"base artifact {path} is not an object")
    return loaded


def run_refresh(
    *,
    source: str,
    raw_dir: Path = RAW_DEFAULT,
    cards_dir: Path = CARDS_DEFAULT,
    fixture_dir: Path = FIXTURE_DEFAULT,
    published_path: Path = PUBLISHED_DEFAULT,
    monitoring_path: Path = MONITORING_DEFAULT,
    out_path: Path = OUT_DEFAULT,
    as_of: date | None = None,
    generated_at: str | None = None,
    cadence_months: int = DEFAULT_CADENCE_MONTHS,
    staleness_threshold_months: int = DEFAULT_STALENESS_THRESHOLD_MONTHS,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Audit, rebuild, contract-check and (unless dry run) write the artifact."""
    if source not in {"bundle", "fixture", "published"}:
        raise RefreshError(f"unknown source mode {source!r}")
    if cadence_months < 1:
        raise RefreshError("cadence must be at least one month")
    if staleness_threshold_months < 0:
        raise RefreshError("staleness threshold cannot be negative")
    when = as_of or datetime.now(UTC).date()
    stamp = generated_at or f"{when.isoformat()}T00:00:00Z"

    published_baseline: dict[str, Any] | None = None
    if source == "published":
        if not published_path.is_file():
            raise RefreshError(
                f"no published artifact at {published_path}. This mode re-derives currency "
                "for an artifact that already exists; it does not build one."
            )
        table_path = monitoring_path
        if not table_path.is_file():
            raise RefreshError(f"monitoring table not found at {table_path}")
        document = _load_base_document(published_path)
        published_baseline = deepcopy(document)
        published_baseline.pop(CURRENCY_KEY, None)
        verified = {
            published_path.name: _sha256(published_path),
            table_path.name: _sha256(table_path),
        }
    elif source == "fixture":
        pins = _load_pins(fixture_dir / CHECKSUM_FILE)
        base_path = fixture_dir / FIXTURE_BASE_FILE
        table_path = fixture_dir / FIXTURE_MONITORING_FILE
        verified = verify_pins(
            {FIXTURE_BASE_FILE: base_path, FIXTURE_MONITORING_FILE: table_path}, pins
        )
        document = _load_base_document(base_path)
    else:
        pins = _load_pins(cards_dir / CHECKSUM_FILE)
        table_path = monitoring_path
        inputs = {f"{raw_dir.as_posix()}/{name}": raw_dir / name for name in BUNDLE_INPUTS}
        inputs.update(_present_pinned_documents(MONITORING_SOURCE_PREFIX, pins))
        verified = verify_pins(inputs, pins)
        if not table_path.is_file():
            raise RefreshError(f"monitoring table not found at {table_path}")
        # The monitoring table is a tracked transcription, not a fetched raw
        # file: git guards its integrity and audit_monitoring re-derives its
        # arithmetic. Its digest is still recorded as provenance.
        verified[table_path.name] = _sha256(table_path)
        try:
            document = build_demo_document(raw_dir)
        except (DemoBuildError, FileNotFoundError) as error:
            raise RefreshError(f"demo rebuild failed: {error}") from None

    rows = load_monitoring_rows(table_path)
    audit_monitoring(rows)

    generated_from = document.get("generated_from")
    if not isinstance(generated_from, dict) or not isinstance(
        generated_from.get("source_data_through"), str
    ):
        raise RefreshError("base artifact does not declare generated_from.source_data_through")
    source_data_through = str(generated_from["source_data_through"])

    document[CURRENCY_KEY] = build_currency(
        source_data_through=source_data_through,
        as_of=when,
        generated_at=stamp,
        mode=source,
        inputs=verified,
        monitoring_rows=rows,
        cadence_months=cadence_months,
        staleness_threshold_months=staleness_threshold_months,
    )

    assert_monitoring_isolated(document)
    try:
        # `published` may only add the currency key. Anything else means the
        # artifact was rebuilt, which this mode is explicitly not allowed to do.
        if published_baseline is not None:
            compare = deepcopy(document)
            compare.pop(CURRENCY_KEY, None)
            if compare != published_baseline:
                raise RefreshError(
                    "published mode changed an analytical value. It may only attach "
                    "currency; rebuild with --source bundle instead."
                )

        validate_demo_v1(document)
    except ContractViolation as error:
        raise RefreshError(f"contract violation: {error}") from None
    _privacy_gate(document)

    if not dry_run:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(document, indent=2, sort_keys=True) + "\n")
    return document


def summarize(document: dict[str, Any], *, dry_run: bool, out_path: Path) -> dict[str, Any]:
    currency = document[CURRENCY_KEY]
    lane = currency["observed_not_model_eligible"]
    return {
        "written": not dry_run,
        "out": None if dry_run else out_path.as_posix(),
        "mode": currency["refresh"]["mode"],
        "source_data_through": currency["source_data_through"],
        "generated_at": currency["generated_at"],
        "status": currency["status"],
        "next_publication_expected": currency["next_publication_expected"]["month"],
        "observed_not_model_eligible_months": lane["months"],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Monthly refresh of the deployed demo artifact (run by a human).",
    )
    parser.add_argument("--source", choices=("bundle", "fixture", "published"), default="bundle")
    parser.add_argument("--raw", type=Path, default=RAW_DEFAULT)
    parser.add_argument("--cards", type=Path, default=CARDS_DEFAULT)
    parser.add_argument("--fixture", type=Path, default=FIXTURE_DEFAULT)
    parser.add_argument("--published", type=Path, default=PUBLISHED_DEFAULT)
    parser.add_argument("--monitoring", type=Path, default=MONITORING_DEFAULT)
    parser.add_argument("--out", type=Path, default=OUT_DEFAULT)
    parser.add_argument(
        "--as-of",
        type=date.fromisoformat,
        default=None,
        help="ISO date used as the currency clock; defaults to today (UTC).",
    )
    parser.add_argument("--cadence-months", type=int, default=DEFAULT_CADENCE_MONTHS)
    parser.add_argument(
        "--staleness-threshold-months",
        type=int,
        default=DEFAULT_STALENESS_THRESHOLD_MONTHS,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run every check and print the summary without writing the artifact.",
    )
    args = parser.parse_args(argv)
    try:
        document = run_refresh(
            source=args.source,
            raw_dir=args.raw,
            cards_dir=args.cards,
            fixture_dir=args.fixture,
            published_path=args.published,
            monitoring_path=args.monitoring,
            out_path=args.out,
            as_of=args.as_of,
            cadence_months=args.cadence_months,
            staleness_threshold_months=args.staleness_threshold_months,
            dry_run=args.dry_run,
        )
    except RefreshError as error:
        print(f"REFRESH FAILED: {error}")
        return 1
    print(
        "REFRESH OK: "
        + json.dumps(
            summarize(document, dry_run=args.dry_run, out_path=args.out),
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
