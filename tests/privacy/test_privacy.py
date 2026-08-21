"""Privacy-boundary tests (issue #7).

Every fixture under ``fixtures/pass`` must scan clean; every fixture under
``fixtures/fail`` must produce at least one blocking finding. Adding a new
leak shape is therefore a one-file change, and a rule that stops working
fails loudly instead of silently passing everything.
"""

import json
from pathlib import Path

import pytest

from stillhere_pipeline.privacy import (
    CELL_CONTEXT_KEYS,
    CELL_NUMERIC_ALLOWLIST,
    Finding,
    normalize_key,
    scan_bundle_dir,
    scan_generated_dir,
    scan_json_document,
    scan_publication_layout,
)

FIXTURES = Path(__file__).parent / "fixtures"


def _blocking(findings: list[Finding]) -> list[Finding]:
    return [f for f in findings if f.severity == "BLOCK"]


def _load(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize("path", sorted((FIXTURES / "pass").glob("*.json")), ids=lambda p: p.name)
def test_aggregate_fixtures_scan_clean(path: Path) -> None:
    blocking = _blocking(scan_json_document(_load(path), where=path.name))
    assert blocking == [], "\n".join(f.render() for f in blocking)


@pytest.mark.parametrize("path", sorted((FIXTURES / "fail").glob("*.json")), ids=lambda p: p.name)
def test_leak_fixtures_are_blocked(path: Path) -> None:
    assert _blocking(scan_json_document(_load(path), where=path.name))


def test_polygon_geometry_is_permitted_but_point_geometry_is_not() -> None:
    polygon = {"type": "Polygon", "coordinates": [[[-117.152, 32.71], [-117.144, 32.716]]]}
    point = {"type": "Point", "coordinates": [-117.14832, 32.71234]}
    assert _blocking(scan_json_document(polygon)) == []
    assert _blocking(scan_json_document(point))


def test_small_cell_counts_are_blocked_unless_declared_suppressed() -> None:
    published = {"area_id": "a", "month": "2026-05", "observed_count": 3}
    suppressed = {"area_id": "a", "month": "2026-05", "observed_count": None, "suppressed": True}
    assert _blocking(scan_json_document(published, min_cell=5))
    assert _blocking(scan_json_document(suppressed, min_cell=5)) == []


def test_small_cell_detection_is_context_based_not_name_based() -> None:
    """The regression that mattered: real schemas do not name counts `count`.

    The first version of this rule looked for field names like ``count`` and
    ``observed`` and passed the A-07 artifact clean while it published 306
    cells below the threshold, because that schema names them ``total``,
    ``individual``, ``structure`` and ``vehicle``.
    """
    cell = {"neighborhood": "barrio_logan", "month": "2021-09", "total": 3}
    assert _blocking(scan_json_document(cell, min_cell=5))

    nested = {
        "neighborhood": "barrio_logan",
        "month": "2021-09",
        "by_type": {"individual": 2, "structure": 1, "vehicle": 0},
    }
    rules = {f.rule for f in _blocking(scan_json_document(nested, min_cell=5))}
    assert rules == {"smallcell.unsuppressed_count"}


def test_small_integers_outside_a_cell_do_not_fire() -> None:
    """Config and metadata carry small integers legitimately."""
    config = {"schema_version": 1, "horizon_periods": 1, "time_increment": 1}
    assert _blocking(scan_json_document(config, min_cell=5)) == []


def test_zero_counts_are_not_small_cell_violations() -> None:
    assert (
        _blocking(scan_json_document({"month": "2026-05", "observed_count": 0}, min_cell=5)) == []
    )


def test_small_cell_threshold_is_configurable() -> None:
    assert (
        _blocking(scan_json_document({"month": "2026-05", "observed_count": 3}, min_cell=2)) == []
    )


def test_key_normalization_catches_spelling_variants() -> None:
    for variant in ("Latitude", "geo-lat", "geoLat", "LAT_DEG"):
        assert _blocking(scan_json_document({variant: 1})), variant
    assert normalize_key("geo-Lat") == "geolat"


def test_counts_are_not_mistaken_for_coordinates() -> None:
    assert _blocking(scan_json_document({"month": "2026-05", "observed_count": 142})) == []


def test_generated_dir_rejects_raw_tabular_files(tmp_path: Path) -> None:
    (tmp_path / "observations.csv").write_text("area,count\n", encoding="utf-8")
    assert _blocking(scan_generated_dir(tmp_path))


def test_generated_dir_reports_unparsable_artifacts(tmp_path: Path) -> None:
    (tmp_path / "broken.json").write_text("{not json", encoding="utf-8")
    assert _blocking(scan_generated_dir(tmp_path))


def test_bundle_scan_catches_embedded_coordinates_and_fields(tmp_path: Path) -> None:
    (tmp_path / "index.js").write_text(
        'const a={"latitude":1};const b="32.71234, -117.14832";', encoding="utf-8"
    )
    rules = {f.rule for f in _blocking(scan_bundle_dir(tmp_path))}
    assert "bundle.forbidden_field" in rules
    assert "bundle.coordinate_pair" in rules


def test_bundle_scan_reads_source_maps(tmp_path: Path) -> None:
    (tmp_path / "index.js.map").write_text('{"sourcesContent":["lat: 32.71234"]}', encoding="utf-8")
    assert scan_bundle_dir(tmp_path) is not None


def test_missing_bundle_is_a_warning_not_a_block(tmp_path: Path) -> None:
    findings = scan_bundle_dir(tmp_path / "absent")
    assert _blocking(findings) == []
    assert findings[0].rule == "scan.bundle_missing"


def test_layout_blocks_raw_data_inside_public(tmp_path: Path) -> None:
    (tmp_path / "public" / "data" / "raw").mkdir(parents=True)
    assert _blocking(scan_publication_layout(tmp_path))


def test_repository_generated_artifacts_are_clean() -> None:
    """The real deployable directory must always pass. This is the live gate."""
    root = Path(__file__).resolve().parents[2]
    blocking = _blocking(scan_generated_dir(root / "public" / "generated"))
    assert blocking == [], "\n".join(f.render() for f in blocking)


def test_suppression_covers_nested_breakdowns() -> None:
    """A suppressed cell must not be re-flagged through its own by_type object.

    Caught in review: suppression exempted only the exact node carrying the
    marker, so the real A-07 shape — a suppressed observation with a nested
    breakdown — still blocked.
    """
    cell = {
        "neighborhood": "barrio_logan",
        "month": "2021-09",
        "total": None,
        "suppressed": True,
        "by_type": {"individual": 2, "structure": 1, "vehicle": 0},
    }
    assert _blocking(scan_json_document(cell, min_cell=5)) == []


def test_integer_month_is_not_a_count() -> None:
    """Caught in review: a schema encoding month as 3 read as three people."""
    cell = {"neighborhood": "barrio_logan", "month": 3, "year": 2021, "total": 91}
    assert _blocking(scan_json_document(cell, min_cell=5)) == []


def test_suppression_does_not_leak_to_a_sibling_cell() -> None:
    """Suppression must cover a cell's children, not the cell next to it."""
    doc = {
        "neighborhoods": [
            {"neighborhood": "a", "month": "2021-09", "total": None, "suppressed": True},
            {"neighborhood": "b", "month": "2021-09", "total": 2},
        ]
    }
    assert len(_blocking(scan_json_document(doc, min_cell=5))) == 1


def test_suppressed_false_does_not_exempt_a_cell() -> None:
    """Caught in review: presence of the key was treated as suppression.

    `{"suppressed": false}` is a common explicit encoding for *published*.
    Treating it as suppressed exempted the cell and, because suppression
    propagates, every breakdown under it.
    """
    for falsy in (False, None, 0, "no", "false", ""):
        cell = {
            "neighborhood": "barrio_logan",
            "month": "2021-09",
            "total": 3,
            "suppressed": falsy,
            "by_type": {"individual": 2, "structure": 1},
        }
        assert _blocking(scan_json_document(cell, min_cell=5)), f"suppressed={falsy!r}"


def test_affirmative_suppression_values_are_accepted() -> None:
    for truthy in (True, "true", "yes", "Suppressed", "REDACTED"):
        cell = {"neighborhood": "a", "month": "2021-09", "total": 3, "suppressed": truthy}
        assert _blocking(scan_json_document(cell, min_cell=5)) == [], f"suppressed={truthy!r}"


def test_every_cell_identifying_key_is_exempt_from_the_count_rule() -> None:
    """Caught in review: `month` was allow-listed but `area` was not.

    A key that identifies a cell is a label, so its own value can never be an
    observation. Asserting the set relation stops a newly-added context key
    from reintroducing the false positive.
    """
    assert CELL_CONTEXT_KEYS <= CELL_NUMERIC_ALLOWLIST
    cell = {"area": 3, "areaid": 2, "month": 3, "total": 91}
    assert _blocking(scan_json_document(cell, min_cell=5)) == []
