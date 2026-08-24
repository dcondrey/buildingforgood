"""The claim inventory refuses the six things it exists to refuse.

The inventory is an enforcement mechanism, so the question worth testing is not
"does it run" but "does it fail when it should". Each test below builds a small
repository on disk, breaks exactly one thing, and asserts the checker names it.
The last test runs the real registry, so a claim that loses its backing in the
course of ordinary work fails here rather than in front of an evaluator.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from stillhere_pipeline.claims import ClaimError, check_registry

REPO_ROOT = Path(__file__).resolve().parents[2]

MINIMAL: dict[str, object] = {
    "version": "claims/v1",
    "surfaces": ["BRIEF.md"],
    "withdrawn": [
        {
            "id": "old-claim",
            "phrase": "the tool is perfect",
            "withdrawn_because": "it was not",
            "replaced_by": "backed",
            "permitted_context": ["We no longer say the tool is perfect."],
        }
    ],
    "claims": [
        {
            "id": "backed",
            "claim": "The guard refuses a bad field.",
            "quote": "refuses a bad field",
            "surfaces": ["BRIEF.md"],
            "code": [{"path": "src/guard.py", "anchor": "def refuse"}],
        }
    ],
    "skipped_tests": {"expected_total": 0, "reasons": []},
}


def build(
    tmp_path: Path,
    registry: dict[str, object],
    brief: str,
    guard: str = "def refuse():\n    pass\n",
) -> Path:
    (tmp_path / "BRIEF.md").write_text(brief, encoding="utf-8")
    (tmp_path / "src").mkdir(exist_ok=True)
    (tmp_path / "src" / "guard.py").write_text(guard, encoding="utf-8")
    (tmp_path / "tests").mkdir(exist_ok=True)
    path = tmp_path / "CLAIMS.yaml"
    path.write_text(yaml.safe_dump(registry), encoding="utf-8")
    return path


def run(tmp_path: Path, registry_path: Path, summary: Path | None = None):
    return check_registry(tmp_path, registry_path, Path("tests"), summary)


def test_a_claim_with_no_code_no_tests_and_no_limitation_fails(tmp_path: Path) -> None:
    registry = yaml.safe_load(yaml.safe_dump(MINIMAL))
    del registry["claims"][0]["code"]
    report = run(tmp_path, build(tmp_path, registry, "It refuses a bad field."))
    assert not report.ok
    assert [f.check for f in report.findings] == ["unbacked"]


def test_a_claim_whose_quote_left_the_document_fails(tmp_path: Path) -> None:
    report = run(tmp_path, build(tmp_path, MINIMAL, "This document says something else entirely."))
    assert not report.ok
    assert [f.check for f in report.findings] == ["quote"]
    assert "the document moved and the claim did not" in report.findings[0].detail


def test_a_claim_whose_code_anchor_was_deleted_fails(tmp_path: Path) -> None:
    registry_path = build(
        tmp_path, MINIMAL, "It refuses a bad field.", guard="# the guard was removed\n"
    )
    report = run(tmp_path, registry_path)
    assert not report.ok
    assert [f.check for f in report.findings] == ["code"]
    assert "outlived the code that backed it" in report.findings[0].detail


def test_a_withdrawn_claim_reappearing_fails(tmp_path: Path) -> None:
    brief = "It refuses a bad field.\n\nHonestly, the tool is perfect.\n"
    report = run(tmp_path, build(tmp_path, MINIMAL, brief))
    assert not report.ok
    assert [f.check for f in report.findings] == ["withdrawn"]


def test_a_withdrawn_claim_inside_its_registered_explanation_passes(tmp_path: Path) -> None:
    brief = "It refuses a bad field.\n\nWe no longer say the tool is perfect.\n"
    report = run(tmp_path, build(tmp_path, MINIMAL, brief))
    assert report.ok, [f.detail for f in report.findings]


def test_an_unregistered_skip_reason_fails(tmp_path: Path) -> None:
    registry_path = build(tmp_path, MINIMAL, "It refuses a bad field.")
    (tmp_path / "tests" / "test_thing.py").write_text(
        'import pytest\n\n\ndef test_x():\n    pytest.skip("a gap nobody declared")\n',
        encoding="utf-8",
    )
    report = run(tmp_path, registry_path)
    assert not report.ok
    assert "a gap nobody declared" in report.findings[0].detail


def test_a_declared_skip_count_that_disagrees_with_pytest_fails(tmp_path: Path) -> None:
    registry = yaml.safe_load(yaml.safe_dump(MINIMAL))
    registry["skipped_tests"] = {
        "expected_total": 1,
        "reasons": [{"reason": "a declared gap", "count": 1, "limitation": "backed"}],
    }
    registry_path = build(tmp_path, registry, "It refuses a bad field.")
    (tmp_path / "tests" / "test_thing.py").write_text(
        'import pytest\n\n\ndef test_x():\n    pytest.skip("a declared gap")\n', encoding="utf-8"
    )
    summary = tmp_path / "summary.txt"
    summary.write_text("SKIPPED [4] tests/test_thing.py:5: a declared gap\n", encoding="utf-8")
    report = run(tmp_path, registry_path, summary)
    assert not report.ok
    assert "but pytest skipped 4" in " ".join(f.detail for f in report.findings)


def test_a_skip_attributed_to_a_claim_that_does_not_exist_is_a_registry_error(
    tmp_path: Path,
) -> None:
    registry = yaml.safe_load(yaml.safe_dump(MINIMAL))
    registry["skipped_tests"] = {
        "expected_total": 0,
        "reasons": [{"reason": "x", "count": 0, "limitation": "no-such-claim"}],
    }
    registry_path = build(tmp_path, registry, "It refuses a bad field.")
    with pytest.raises(ClaimError, match="not a claim"):
        run(tmp_path, registry_path)


def test_the_shipped_registry_passes(tmp_path: Path) -> None:
    """Every claim this project actually makes is backed or disclosed.

    No pytest summary is passed, so this checks the reason set and the declared
    totals, not the runtime counts. `scripts/verify.sh` supplies the summary and
    reconciles those, because only a real run knows how many tests skipped.
    """
    report = check_registry(REPO_ROOT, REPO_ROOT / "docs/adoption/CLAIMS.yaml", Path("tests"))
    assert report.ok, "\n".join(f"{f.claim_id}: {f.check}: {f.detail}" for f in report.findings)
    assert report.claims_checked >= 15
