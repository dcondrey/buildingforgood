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
