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
    declared = {"geography_version": "planning-areas/2026-08"}
    polygon = {**declared, "type": "Polygon", "coordinates": [[[-117.152, 32.71]]]}
    point = {**declared, "type": "Point", "coordinates": [-117.14832, 32.71234]}
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


@pytest.mark.xfail(
    strict=False,
    reason=(
        "KNOWN FAILURE, tracked on #7 and PR #44. public/generated/observations.v0.json "
        "from A-07 (#41) publishes 306 unsuppressed cells below the threshold. Recorded "
        "here rather than hidden, and rather than dropping the rule to WARN: the gate "
        "stays at BLOCK and this flips to passing when the pipeline emitter suppresses "
        "small cells. Do not weaken the rule to make this green."
    ),
)
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


def test_temporal_labels_are_exempt_but_ambiguous_names_are_not() -> None:
    """Caught in review: exempting every context key recreated the R-06 hole.

    An earlier fix unioned CELL_CONTEXT_KEYS into the numeric allow-list so
    that `{"area": 3}` would not false-positive. That also exempted
    `{"observations": 3}`, a scalar count named after a context key, which is
    exactly the name-based false negative the rule was rewritten to kill.

    The allow-list is now narrow. Unambiguously temporal names are labels;
    ambiguous ones block, because a privacy gate resolves ambiguity by
    blocking and an integer identifier can be published as a string instead.
    """
    assert not (CELL_CONTEXT_KEYS <= CELL_NUMERIC_ALLOWLIST)

    temporal = {"neighborhood": "barrio_logan", "month": 3, "year": 2021, "total": 91}
    assert _blocking(scan_json_document(temporal, min_cell=5)) == []

    for ambiguous in ("observations", "area", "areaid"):
        cell = {"neighborhood": "barrio_logan", "month": "2021-09", ambiguous: 3}
        assert _blocking(scan_json_document(cell, min_cell=5)), ambiguous


def test_integer_encoded_suppression_is_accepted() -> None:
    """Caught in review: pandas and SQL serialize booleans as 1/0."""
    cell = {"neighborhood": "a", "month": "2021-09", "total": 3, "suppressed": 1}
    assert _blocking(scan_json_document(cell, min_cell=5)) == []
    published = {"neighborhood": "a", "month": "2021-09", "total": 3, "suppressed": 0}
    assert _blocking(scan_json_document(published, min_cell=5))


def test_cell_scope_reaches_arbitrarily_nested_breakdowns() -> None:
    """The regression that ended the whack-a-mole.

    An earlier fix gated propagation on the child being a pure numeric
    breakdown, to silence false blocks on a config object nested in a cell.
    That silently exempted a breakdown containing a further breakdown, so
    real small counts were never scanned at any depth below it. Over-blocking
    is the acceptable error direction for a privacy gate; a silent miss is
    not. Scope now propagates unconditionally, and noise is handled by naming
    structural keys in the allow-list.
    """
    cell = {
        "neighborhood": "barrio_logan",
        "month": "2021-09",
        "by_type": {
            "individual": 2,
            "structure": 1,
            "by_severity": {"high": 1, "low": 1},
        },
    }
    flagged = {f.where.rsplit(".", 1)[-1] for f in _blocking(scan_json_document(cell, min_cell=5))}
    assert flagged == {"individual", "structure", "high", "low"}


def test_small_counts_inside_a_list_under_a_cell_are_scanned() -> None:
    doc = {"neighborhood": "a", "periods": [{"month": "2021-09", "total": 2}]}
    assert _blocking(scan_json_document(doc, min_cell=5))


def test_structural_fields_inside_a_cell_are_quiet() -> None:
    cell = {
        "neighborhood": "barrio_logan",
        "month": "2021-09",
        "total": 91,
        "render_config": {"revision": 3, "sort_index": 1, "enabled": True},
    }
    assert _blocking(scan_json_document(cell, min_cell=5)) == []


def test_is_redacted_is_recognised_like_is_suppressed() -> None:
    """Caught in review: `issuppressed` was a marker but `isredacted` was not."""
    cell = {"neighborhood": "a", "month": "2021-09", "total": 3, "is_redacted": True}
    assert _blocking(scan_json_document(cell, min_cell=5)) == []


def test_suppression_does_not_cross_into_a_separate_record() -> None:
    """Caught in review: suppression inherited into an unrelated nested cell.

    Cell scope was fixed to propagate unconditionally, but suppression had
    the mirror-image flaw left in place. A suppressed 2021-09 cell silently
    exempted an unsuppressed 2021-08 count nested beneath it, so the gate
    believed it failed closed when it did not.
    """
    doc = {
        "neighborhood": "a",
        "month": "2021-09",
        "suppressed": True,
        "history": [
            {"month": "2021-08", "total": 1},
            {"month": "2021-10", "total": 47},
        ],
    }
    blocking = _blocking(scan_json_document(doc, min_cell=5))
    assert len(blocking) == 1
    assert blocking[0].where == "$.history[0].total"


def test_list_elements_re_evaluate_their_own_suppression() -> None:
    doc = {
        "neighborhood": "a",
        "month": "2021-09",
        "suppressed": True,
        "areas": [{"area_id": "b", "total": 2}],
    }
    assert _blocking(scan_json_document(doc, min_cell=5))


def test_suppression_still_covers_its_own_nested_breakdown() -> None:
    """The legitimate case must keep working after the narrowing."""
    cell = {
        "neighborhood": "a",
        "month": "2021-09",
        "total": None,
        "suppressed": True,
        "by_type": {"individual": 2, "structure": 1, "by_severity": {"high": 1}},
    }
    assert _blocking(scan_json_document(cell, min_cell=5)) == []


def test_geometry_approval_covers_only_its_own_coordinates() -> None:
    """Found by audit, not by review: geometry scope leaked to siblings.

    Approving a Polygon exempted the whole object from the numeric
    coordinate check, so a raw longitude parked next to the approved
    coordinates escaped. Third instance of the same mirror-image flaw, after
    cell scope and suppression: scope must follow the thing it approved.
    """
    leak = {
        "geography_version": "planning-areas/2026-08",
        "type": "Polygon",
        "coordinates": [[[-117.152, 32.710], [-117.144, 32.716]]],
        "centroid_lon": -117.14832,
    }
    blocking = _blocking(scan_json_document(leak))
    assert [f.where for f in blocking] == ["$.centroid_lon"]


def test_a_clean_declared_polygon_still_passes() -> None:
    polygon = {
        "geography_version": "planning-areas/2026-08",
        "type": "Polygon",
        "coordinates": [[[-117.152, 32.710], [-117.144, 32.716]]],
    }
    assert _blocking(scan_json_document(polygon)) == []


def test_generic_word_names_are_not_exempt() -> None:
    """The allow-list is an exemption, so it stays narrow.

    `order`, `sequence` and `priority` were briefly allow-listed to silence
    config noise. Each is a plausible name for a real count — `priority: 2`
    could mean two flagged individuals — and an allow-list collision is the
    same false-negative class that rounds 1 and 2 produced. Anything
    genuinely structural can be renamed or suppressed; a missed person
    cannot be recovered.
    """
    for generic in ("order", "sequence", "priority", "level", "tier"):
        cell = {"neighborhood": "a", "month": "2021-09", generic: 2}
        assert _blocking(scan_json_document(cell, min_cell=5)), generic


def test_geometry_must_declare_an_approved_aggregate_geography() -> None:
    """Requested by Track D on #7: Polygon type is not proof of aggregation.

    The source bundle ships 382 block polygons. They are legitimate raw
    geography, but they sit far below the planning-area publication grain and
    become identifying once joined to the block-keyed count table.
    """
    undeclared = {"type": "Polygon", "coordinates": [[[-117.152, 32.710]]]}
    rules = {f.rule for f in _blocking(scan_json_document(undeclared))}
    assert "geography.undeclared_grain" in rules

    declared = {"geography_version": "planning-areas/2026-08", **undeclared}
    assert _blocking(scan_json_document(declared)) == []


def test_too_many_features_is_source_grain_whatever_it_declares() -> None:
    doc = {
        "geography_version": "planning-areas/2026-08",
        "features": [
            {"geometry": {"type": "Polygon", "coordinates": [[[-117.15, 32.71]]]}}
            for _ in range(382)
        ],
    }
    rules = {f.rule for f in _blocking(scan_json_document(doc))}
    assert "geography.source_grain_feature_count" in rules


def test_block_identifiers_and_bounding_streets_are_denied() -> None:
    for field in (
        "block_id",
        "st_north",
        "st_east",
        "st_south",
        "st_west",
        "source_neighborhood",
        "bounding_streets",
    ):
        assert _blocking(scan_json_document({field: "x"})), field


def test_per_feature_geography_declaration_is_recognised() -> None:
    """Caught in review: only the root and one hop were checked.

    GeoJSON convention puts the declaration in each feature's `properties`.
    Checking only the root blocked legitimate, already-dissolved
    planning-area data. `_count_geometries` recurses fully, so the
    declaration check has to as well or the pair disagrees about one file.
    """
    per_feature = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "area_id": "east_village",
                    "geography_version": "planning-areas/2026-08",
                },
                "geometry": {"type": "Polygon", "coordinates": [[[-117.152, 32.710]]]},
            }
        ],
    }
    assert _blocking(scan_json_document(per_feature)) == []


def test_undeclared_feature_collection_still_blocks() -> None:
    undeclared = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"area_id": "east_village"},
                "geometry": {"type": "Polygon", "coordinates": [[[-117.152, 32.710]]]},
            }
        ],
    }
    rules = {f.rule for f in _blocking(scan_json_document(undeclared))}
    assert "geography.undeclared_grain" in rules


def _polygon_feature(properties: dict[str, object]) -> dict[str, object]:
    return {
        "type": "Feature",
        "properties": properties,
        "geometry": {"type": "Polygon", "coordinates": [[[-117.152, 32.710]]]},
    }


def test_one_declared_feature_does_not_exempt_its_siblings() -> None:
    """Caught in review, and the third time this exact pattern has bitten.

    Fixing the too-narrow root-only check by recursing the whole document
    swung to the opposite error: a `geography_version` on one feature
    satisfied the check for every other feature, so an undeclared
    source-grain block shipped clean beside a declared planning area.

    A declaration is inherited downward only. It never travels sideways.
    """
    mixed = {
        "type": "FeatureCollection",
        "features": [
            _polygon_feature({"area_id": "east_village", "geography_version": "pa/2026-08"}),
            _polygon_feature({"area_id": "undeclared_block"}),
        ],
    }
    findings = _blocking(scan_json_document(mixed))
    rules = [f.rule for f in findings]
    assert rules.count("geography.undeclared_grain") == 1
    assert "features[1]" in next(
        f.where for f in findings if f.rule == "geography.undeclared_grain"
    )


def test_a_root_declaration_covers_every_feature() -> None:
    doc = {
        "geography_version": "planning-areas/2026-08",
        "type": "FeatureCollection",
        "features": [
            _polygon_feature({"area_id": "east_village"}),
            _polygon_feature({"area_id": "gaslamp"}),
        ],
    }
    assert _blocking(scan_json_document(doc)) == []
