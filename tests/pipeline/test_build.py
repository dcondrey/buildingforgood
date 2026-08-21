import hashlib
import json
from pathlib import Path

import pytest

from stillhere_pipeline.build import BuildError, run_build
from stillhere_pipeline.contracts import (
    ContractViolation,
    assert_no_precise_fields,
    validate_observations_v0,
)

COUNTS_CSV = (
    "file_id,neighborhood,date,count,type,x,y\n"
    "f1,east_village,2018-01-24,5,Individual,1.0,2.0\n"
    "f1,east_village,2018-01-24,5,Individual,1.0,2.0\n"
    "f1,gaslamp,2018-01-24,3,Structure,3.0,4.0\n"
    "f2,core,2018-03-27,2,1,5.0,6.0\n"
    "f3,atlantis,2018-03-27,1,Individual,7.0,8.0\n"
)
FILES_CSV = "file_id,total_count\nf1,9\nf2,2\n"


def write_fixture_tree(root: Path, counts: str = COUNTS_CSV, files: str = FILES_CSV) -> None:
    raw = root / "data" / "raw" / "sdrdl_source"
    cards = root / "data" / "cards"
    raw.mkdir(parents=True)
    cards.mkdir(parents=True)
    (raw / "counts.csv").write_text(counts)
    (raw / "files.csv").write_text(files)
    (cards / "source_ledger.yaml").write_text('retrieved_at: "2026-08-21T01:06:45Z"\n')
    pins = "\n".join(
        f"{hashlib.sha256(text.encode()).hexdigest()}  data/raw/sdrdl_source/{name}"
        for name, text in [("counts.csv", counts), ("files.csv", files)]
    )
    (cards / "checksums.sha256").write_text(pins + "\n")


def build(root: Path) -> dict[str, object]:
    return run_build(root / "data" / "raw", root / "data" / "cards", root / "out")


class TestRunBuild:
    def test_builds_valid_artifacts_from_fixture(self, tmp_path: Path) -> None:
        write_fixture_tree(tmp_path)
        summary = build(tmp_path)
        assert summary == {
            "neighborhoods": 3,
            "months": 2,
            "invalid_rows": 1,
            "duplicates_dropped": 1,
            "file_total_mismatches": 1,
        }
        observations = json.loads((tmp_path / "out" / "observations.v0.json").read_text())
        validate_observations_v0(observations)
        by_id = {n["neighborhood"]: n for n in observations["neighborhoods"]}
        assert by_id["east_village"]["observations"][0]["total"] == 5
        assert by_id["city_center"]["label_variants"] == ["core"]
        quality = json.loads((tmp_path / "out" / "quality_report.v0.json").read_text())
        assert quality["file_total_mismatches"] == [
            {"file_id": "f1", "computed": 8, "reported": 9, "delta": -1}
        ]
        assert quality["invalid_rows"][0]["row_number"] == 5

    def test_build_is_byte_deterministic(self, tmp_path: Path) -> None:
        first = tmp_path / "one"
        second = tmp_path / "two"
        for root in (first, second):
            root.mkdir()
            write_fixture_tree(root)
            build(root)
        for name in ("observations.v0.json", "quality_report.v0.json", "manifest.v0.json"):
            assert (first / "out" / name).read_bytes() == (second / "out" / name).read_bytes()

    def test_checksum_mismatch_fails_closed(self, tmp_path: Path) -> None:
        write_fixture_tree(tmp_path)
        counts = tmp_path / "data" / "raw" / "sdrdl_source" / "counts.csv"
        counts.write_text(COUNTS_CSV + "f9,marina,2018-01-24,1,Individual,1.0,2.0\n")
        with pytest.raises(BuildError, match="checksum mismatch"):
            build(tmp_path)

    def test_missing_pin_fails_closed(self, tmp_path: Path) -> None:
        write_fixture_tree(tmp_path)
        (tmp_path / "data" / "cards" / "checksums.sha256").write_text("")
        with pytest.raises(BuildError, match="no pinned checksum"):
            build(tmp_path)

    def test_unquoted_ledger_timestamp_fails_closed(self, tmp_path: Path) -> None:
        write_fixture_tree(tmp_path)
        ledger = tmp_path / "data" / "cards" / "source_ledger.yaml"
        ledger.write_text("retrieved_at: 2026-08-21T01:06:45Z\n")
        with pytest.raises(BuildError, match="retrieved_at"):
            build(tmp_path)

    def test_missing_ledger_timestamp_fails_closed(self, tmp_path: Path) -> None:
        write_fixture_tree(tmp_path)
        (tmp_path / "data" / "cards" / "source_ledger.yaml").write_text("version: 1\n")
        with pytest.raises(BuildError, match="retrieved_at"):
            build(tmp_path)

    def test_fractional_reported_total_not_in_mismatches(self, tmp_path: Path) -> None:
        files = "file_id,total_count\nf1,9\nf2,884.6\n"
        write_fixture_tree(tmp_path, files=files)
        build(tmp_path)
        quality = json.loads((tmp_path / "out" / "quality_report.v0.json").read_text())
        assert [m["file_id"] for m in quality["file_total_mismatches"]] == ["f1"]

    def test_source_maps_without_counts_reported(self, tmp_path: Path) -> None:
        files = FILES_CSV + "f9,4\n"
        write_fixture_tree(tmp_path, files=files)
        build(tmp_path)
        quality = json.loads((tmp_path / "out" / "quality_report.v0.json").read_text())
        assert quality["source_maps_without_counts"] == ["f9"]

    def test_no_rollup_totals_are_published(self, tmp_path: Path) -> None:
        # PR #44 review, point 4: a published rollup (neighborhood, downtown,
        # or annual total) reopens subtraction recovery across the rollup's
        # members. The artifact publishes ONLY per-row totals; this pins the
        # exact key surface so adding any rollup fails here first and forces
        # the suppression design to extend to it.
        write_fixture_tree(tmp_path)
        build(tmp_path)
        doc = json.loads((tmp_path / "out" / "observations.v0.json").read_text())
        assert set(doc) == {
            "schema",
            "contract",
            "source",
            "months_observed",
            "missing_months_global",
            "neighborhoods",
            "comparability_events",
        }
        for entry in doc["neighborhoods"]:
            assert set(entry) == {
                "neighborhood",
                "label_variants",
                "coverage_start",
                "coverage_end",
                "observed_gap_months",
                "observations",
            }
            for observation in entry["observations"]:
                assert set(observation) <= {
                    "month",
                    "total",
                    "by_type",
                    "by_type_suppressed",
                    "suppressed",
                }

    def test_embedded_newline_in_quoted_field_survives(self, tmp_path: Path) -> None:
        counts = (
            "file_id,neighborhood,date,count,type,x,y\n"
            'f1,east_village,2018-01-24,5,Individual,1.0,"2.0\nnote"\n'
        )
        write_fixture_tree(tmp_path, counts=counts)
        summary = build(tmp_path)
        assert summary["invalid_rows"] == 0
        observations = json.loads((tmp_path / "out" / "observations.v0.json").read_text())
        assert observations["neighborhoods"][0]["observations"][0]["total"] == 5

    def test_artifacts_never_carry_precise_locations(self, tmp_path: Path) -> None:
        write_fixture_tree(tmp_path)
        build(tmp_path)
        for name in ("observations.v0.json", "quality_report.v0.json"):
            doc = json.loads((tmp_path / "out" / name).read_text())
            assert_no_precise_fields(doc)


class TestPrecautionGuard:
    def test_deny_list_rejects_nested_precise_field(self) -> None:
        with pytest.raises(ContractViolation, match="precise-location"):
            assert_no_precise_fields({"neighborhoods": [{"points": [{"x": 1.0}]}]})
