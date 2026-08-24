"""The portability gate, proved against the defect that created it.

Every other gate here has a known-bad input it has been watched failing on: the
mutation gate has ten mutants, the claim inventory has fourteen negative cases,
the privacy scanner has its leak fixtures. This gate is new, so it gets the same
treatment from the start, and its first fixture is not invented — it is the
literal line that shipped and broke CI.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from stillhere_pipeline.portability import RULES, scan, scan_text

REPO = Path(__file__).resolve().parents[2]

#: The line as it actually stood in scripts/verify.sh when CI first ran it, and
#: the line that replaced it. If the rule ever stops telling these apart, the
#: gate has stopped being about anything.
SHIPPED_BAD = 'SKIP_SUMMARY="$(mktemp -t stillhere-skips)"'
SHIPPED_FIX = 'SKIP_SUMMARY="$(mktemp "${TMPDIR:-/tmp}/stillhere-skips.XXXXXX")"'

#: One known-bad line per rule. A rule with no fixture is a rule nobody has
#: watched fire, which is the thing this file exists to prevent.
KNOWN_BAD: dict[str, str] = {
    "mktemp-prefix": 'LOG="$(mktemp -t stillhere-venv)"',
    "sed-i-no-suffix": "sed -i 's/a/b/' file.txt",
    "readlink-f": 'root="$(readlink -f "$0")"',
    "date-d": 'stamp="$(date -d yesterday +%F)"',
    "grep-P": "grep -P '\\d+' file.txt",
    "stat-format": 'size="$(stat -c %s file.txt)"',
    "xargs-r": "printf '' | xargs -r rm",
    "find-printf": "find . -printf '%p\\n'",
    "base64-w": "base64 -w 0 file.bin",
    "sed-r": "sed -r 's/(a)/\\1/' file.txt",
    "tac": "tac file.txt",
}


def test_every_rule_has_a_known_bad_line() -> None:
    assert {rule.name for rule in RULES} == set(KNOWN_BAD)


@pytest.mark.parametrize("name", sorted(KNOWN_BAD))
def test_each_rule_fires_on_its_known_bad_line(name: str) -> None:
    findings = scan_text(KNOWN_BAD[name], "probe.sh")
    assert [f.rule for f in findings] == [name], f"{name} did not fire on its own fixture"


def test_the_line_that_actually_broke_ci_is_caught() -> None:
    findings = scan_text(SHIPPED_BAD, "scripts/verify.sh")
    assert [f.rule for f in findings] == ["mktemp-prefix"]
    assert "too few X's" in findings[0].detail


def test_the_replacement_for_it_is_not_caught() -> None:
    assert scan_text(SHIPPED_FIX, "scripts/verify.sh") == []


def test_a_commented_out_example_is_not_a_finding() -> None:
    assert scan_text("# never write mktemp -t name", "doc.sh") == []


def test_a_waiver_needs_a_reason() -> None:
    bare = scan_text(f"{SHIPPED_BAD} # portability-ok:", "s.sh")
    assert [f.rule for f in bare] == ["mktemp-prefix"], "an empty waiver must not silence a rule"
    excused = scan_text(f"{SHIPPED_BAD} # portability-ok: GNU-only script", "s.sh")
    assert excused == []


def test_the_repository_itself_is_clean() -> None:
    findings = scan(REPO)
    assert findings == [], "\n".join(f.render() for f in findings)
