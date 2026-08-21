"""Raw-independent provenance bindings for the shipped demo snapshot."""

from __future__ import annotations

import json
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
DEMO_SOURCE_IDS = {
    "hackathon_organizer_bundle",
    "get_it_done_cd3",
    "parking_meter_activity",
    "noaa_count_day_weather",
}


def _pins() -> dict[str, str]:
    pins: dict[str, str] = {}
    for line in (REPO_ROOT / "data" / "cards" / "checksums.sha256").read_text().splitlines():
        if not line or line.startswith("#"):
            continue
        digest, path = line.split(maxsplit=1)
        pins[path] = digest
    return pins


def _ledger() -> dict:
    return yaml.safe_load((REPO_ROOT / "data" / "cards" / "source_ledger.yaml").read_text())


def test_every_embedded_demo_input_hash_has_an_exact_pin() -> None:
    artifact = json.loads((REPO_ROOT / "public" / "generated" / "demo.v1.json").read_text())
    embedded = artifact["generated_from"]["input_sha256"]
    pinned_by_name = {Path(path).name: digest for path, digest in _pins().items()}

    assert embedded == {name: pinned_by_name[name] for name in embedded}


def test_demo_ledger_files_match_embedded_input_surface() -> None:
    ledger = _ledger()
    sources = {source["id"]: source for source in ledger["sources"]}
    lineage = ledger["artifact_lineages"]["demo_v1"]
    lineage_ids = set(lineage["required_source_ids"]) | set(
        lineage["optional_diagnostic_source_ids"]
    )
    assert lineage_ids == DEMO_SOURCE_IDS
    assert DEMO_SOURCE_IDS <= sources.keys()

    ledger_files = {
        file["raw_path"] for source_id in DEMO_SOURCE_IDS for file in sources[source_id]["files"]
    }
    artifact = json.loads((REPO_ROOT / "public" / "generated" / "demo.v1.json").read_text())
    embedded_names = set(artifact["generated_from"]["input_sha256"])

    assert {Path(path).name for path in ledger_files} == embedded_names
    assert ledger_files <= _pins().keys()
