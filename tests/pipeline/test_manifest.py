import hashlib

import pytest

from stillhere_pipeline.manifest import build_manifest


def test_manifest_checksums_inputs() -> None:
    manifest = build_manifest("0.0.1", "2026-08-20T00:00:00Z", {"a.csv": b"hello"})
    assert manifest["schema_version"] == "0.0.1"
    assert manifest["inputs"]["a.csv"] == hashlib.sha256(b"hello").hexdigest()


def test_manifest_orders_inputs_deterministically() -> None:
    forward = build_manifest("0.0.1", "t", {"a": b"1", "b": b"2"})
    reverse = build_manifest("0.0.1", "t", {"b": b"2", "a": b"1"})
    assert list(forward["inputs"]) == ["a", "b"]
    assert forward == reverse


def test_manifest_rejects_empty_schema_version() -> None:
    with pytest.raises(ValueError, match="schema_version"):
        build_manifest("", "t", {})


def test_manifest_rejects_empty_build_time() -> None:
    with pytest.raises(ValueError, match="build_time"):
        build_manifest("0.0.1", "", {})
