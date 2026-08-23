"""Golden-output test: pinned fixture in, exact artifact out.

Phase 0 finding F-2 says the organizer bundle is not in the repository, so no
end-to-end test can start from the real inputs. This one starts from a
committed *synthetic* fixture instead — area-month aggregates only, no
coordinates, no block-keyed rows — and asserts the emitted artifact byte for
byte. If any pipeline stage changes what it writes, this fails and the diff
names the field.

Regenerating the expectation is a deliberate act, documented in
docs/project/REFRESH.md. Do not refresh it to make a red test green.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pytest

from stillhere_pipeline.contracts import validate_demo_v1
from stillhere_pipeline.privacy import scan_json_document
from stillhere_pipeline.refresh import RefreshError, run_refresh

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_DIR = REPO_ROOT / "tests" / "pipeline" / "fixtures" / "refresh"
EXPECTED_PATH = FIXTURE_DIR / "expected" / "demo.v1.json"
AS_OF = date(2026, 8, 23)


def _refresh(out_path: Path, **overrides: object) -> dict:
    kwargs: dict = {
        "source": "fixture",
        "fixture_dir": FIXTURE_DIR,
        "out_path": out_path,
        "as_of": AS_OF,
    }
    kwargs.update(overrides)
    return run_refresh(**kwargs)


def test_fixture_refresh_matches_the_golden_artifact(tmp_path: Path) -> None:
    out_path = tmp_path / "demo.v1.json"
    document = _refresh(out_path)

    expected = json.loads(EXPECTED_PATH.read_text(encoding="utf-8"))
    assert document == expected
    assert out_path.read_text(encoding="utf-8") == EXPECTED_PATH.read_text(encoding="utf-8")


def test_golden_artifact_satisfies_the_contract_and_privacy_gate() -> None:
    expected = json.loads(EXPECTED_PATH.read_text(encoding="utf-8"))
    validate_demo_v1(expected)
    assert [f for f in scan_json_document(expected) if f.severity == "BLOCK"] == []


def test_golden_currency_block_is_the_shape_the_ui_consumes() -> None:
    currency = json.loads(EXPECTED_PATH.read_text(encoding="utf-8"))["currency"]
    assert currency["source_data_through"] == "2025-12"
    assert currency["generated_at"] == "2026-08-23T00:00:00Z"
    assert currency["status"] == "stale"
    assert currency["is_stale"] is True
    assert currency["staleness"]["elapsed"] == {"months": 8}
    assert currency["staleness"]["threshold"] == {"months": 2}
    assert currency["next_publication_expected"]["month"] == "2026-09"
    assert currency["next_publication_expected"]["source_publication_scheduled"] is False

    lane = currency["observed_not_model_eligible"]
    assert lane["months"] == ["2026-03", "2026-06"]
    assert all(row["model_eligible"] is False for row in lane["rows"])
    assert lane["exclusion_reason"]["source"] == "data/monitoring/README.md"
    assert lane["excluded_from"] == [
        "demo_v1_training",
        "demo_v1_forecast_selection",
        "demo_v1_planner",
    ]


def test_model_ineligible_rows_stay_out_of_every_model_lane() -> None:
    document = json.loads(EXPECTED_PATH.read_text(encoding="utf-8"))
    excluded = set(document["currency"]["observed_not_model_eligible"]["months"])

    assert excluded.isdisjoint(row["month"] for row in document["observations"]["history"])
    assert excluded.isdisjoint(document["observations"]["missing_months"])
    assert excluded.isdisjoint(row["month"] for row in document["observations"]["latest_by_area"])
    assert document["forecast"]["target_month"] not in excluded
    assert document["forecast"]["data_frozen_through"] not in excluded
    # The rows exist in exactly one place. Every block of the document
    # except `currency` is checked, not three named ones: a fourth lane
    # added later is covered the day it lands.
    others = [key for key in document if key != "currency"]
    assert {"observations", "forecast", "planner"} <= set(others)
    for lane in others:
        serialized = json.dumps(document[lane])
        assert "observed_not_model_eligible" not in serialized, lane
        for month in excluded:
            assert month not in serialized, f"{lane} mentions {month}"


def test_dry_run_checks_everything_and_writes_nothing(tmp_path: Path) -> None:
    out_path = tmp_path / "demo.v1.json"
    document = _refresh(out_path, dry_run=True)
    assert document["currency"]["status"] == "stale"
    assert not out_path.exists()


def test_a_tampered_fixture_fails_its_pin(tmp_path: Path) -> None:
    tampered = tmp_path / "fixture"
    tampered.mkdir()
    for name in ("demo_base.v1.json", "dsdp_public_checkpoints.csv", "checksums.sha256"):
        (tampered / name).write_text((FIXTURE_DIR / name).read_text(encoding="utf-8"))
    table = tampered / "dsdp_public_checkpoints.csv"
    table.write_text(table.read_text(encoding="utf-8").replace(",120,", ",121,"))

    with pytest.raises(RefreshError, match="checksum mismatch"):
        _refresh(tmp_path / "out.json", fixture_dir=tampered)
