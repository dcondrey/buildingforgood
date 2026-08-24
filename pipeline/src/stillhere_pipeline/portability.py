"""Catch shell constructs that behave differently on BSD and GNU.

Every script here is written on macOS and every CI run is Linux. That gap is
invisible until something crosses it, and on 2026-08-24 two things did in the
same push:

* ``mktemp -t stillhere-skips`` — a *prefix* to BSD, a template *needing
  trailing X's* to GNU. ``verify.sh`` had therefore never been able to run on
  Linux at all, and ``refresh.sh`` carried the same call twice, where it would
  have produced ``mktemp: too few X's in template`` from the very prerequisite
  check written to keep shell errors away from a non-developer.
* a test matching a refusal message that a non-macOS host never reaches.

Both were green locally and had simply never executed on the platform that
matters. That is the same defect as a mutation gate grading over a red suite or
a reconciliation that passes when its input is missing: a check reporting a
result it did not earn.

A container would be the direct fix and is not always available. This is the
part that runs anywhere: the divergences are a short, known list, and a script
can be read for them before a machine ever runs it.

Opting out is deliberate and per-line: append ``# portability-ok: <reason>``.
The reason is required, so waiving a rule is a sentence somebody wrote.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import NamedTuple

WAIVER = re.compile(r"#\s*portability-ok:\s*\S")


class Rule(NamedTuple):
    """One construct that does not mean the same thing on both platforms."""

    name: str
    pattern: re.Pattern[str]
    detail: str


#: `mktemp -t NAME` is the one that actually shipped. BSD treats NAME as a
#: prefix and appends its own randomness; GNU treats it as a template and
#: demands at least three trailing X's. Spelling the path out satisfies both.
RULES: tuple[Rule, ...] = (
    Rule(
        "mktemp-prefix",
        re.compile(r"\bmktemp\b[^\n|;&]*?\s-t\s+(?!.*XXX)[^\s;|&]+"),
        "`mktemp -t NAME` is a prefix on BSD and a template needing trailing X's on "
        'GNU, which fails with "too few X\'s in template". Write the path out: '
        'mktemp "${TMPDIR:-/tmp}/name.XXXXXX"',
    ),
    Rule(
        "sed-i-no-suffix",
        re.compile(r"\bsed\b[^\n|;&]*?\s-i(?:\s+-|\s*$|\s+['\"]?[-/.a-zA-Z0-9_$])(?![^\n]*\.bak)"),
        "`sed -i` takes a mandatory backup suffix on BSD and an optional one on GNU, "
        "so the same line edits in place on Linux and eats the next argument on macOS. "
        "Use a temp file and mv, or perl -i.",
    ),
    Rule(
        "readlink-f",
        re.compile(r"\breadlink\s+-f\b"),
        "`readlink -f` does not exist on stock macOS. Use `cd ... && pwd -P`, or python.",
    ),
    Rule(
        "date-d",
        re.compile(r"\bdate\b[^\n|;&]*?\s(?:-d\s|--date[= ])"),
        "`date -d` is GNU; BSD spells relative dates `date -v`. Compute dates in python.",
    ),
    Rule(
        "grep-P",
        re.compile(r"\bgrep\b[^\n|;&]*?\s-[a-zA-Z]*P\b"),
        "`grep -P` (PCRE) is unavailable in stock BSD grep. Use -E, or python.",
    ),
    Rule(
        "stat-format",
        re.compile(r"\bstat\b[^\n|;&]*?\s-(?:c|f)\s"),
        "`stat -c` is GNU and `stat -f` is BSD, and they are not the same flag. "
        "Use python or wc/ls for the one field you need.",
    ),
    Rule(
        "xargs-r",
        re.compile(r"\bxargs\b[^\n|;&]*?\s-r\b"),
        "`xargs -r` is GNU. BSD xargs already skips an empty input, so drop the flag.",
    ),
    Rule(
        "find-printf",
        re.compile(r"\bfind\b[^\n|;&]*?\s-printf\b"),
        "`find -printf` is GNU only. Use -print0 with a loop, or -exec.",
    ),
    Rule(
        "base64-w",
        re.compile(r"\bbase64\b[^\n|;&]*?\s-w\b"),
        "`base64 -w` is GNU; BSD base64 does not wrap and rejects the flag. Use tr -d.",
    ),
    Rule(
        "sed-r",
        re.compile(r"\bsed\b[^\n|;&]*?\s-r\b"),
        "`sed -r` is GNU; `-E` is understood by both and means the same thing.",
    ),
    Rule(
        "tac",
        re.compile(r"(?:^|[|;&(]\s*)tac\b"),
        "`tac` is GNU only. Use `tail -r` on BSD, or python — but not both blindly.",
    ),
)


@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    rule: str
    text: str
    detail: str

    def render(self) -> str:
        return f"{self.path}:{self.line}: [{self.rule}] {self.text.strip()}\n    {self.detail}"


def _is_shell(path: Path) -> bool:
    if path.suffix in {".sh", ".bash"}:
        return True
    try:
        first = path.open("r", encoding="utf-8", errors="replace").readline()
    except OSError:
        return False
    return first.startswith("#!") and ("sh" in first or "bash" in first)


def shell_scripts(root: Path) -> Iterator[Path]:
    """Every shell script in the tree, skipping vendored and generated trees."""
    skip = {"node_modules", ".git", ".venv", "dist", "__pycache__", ".mypy_cache", ".ruff_cache"}
    for path in sorted(root.rglob("*")):
        if not path.is_file() or any(part in skip for part in path.parts):
            continue
        if _is_shell(path):
            yield path


def scan_text(text: str, path: str) -> list[Finding]:
    """Findings for one script's source, ignoring comments and waived lines."""
    findings: list[Finding] = []
    for number, raw in enumerate(text.splitlines(), start=1):
        stripped = raw.lstrip()
        if stripped.startswith("#") or WAIVER.search(raw):
            continue
        for rule in RULES:
            if rule.pattern.search(raw):
                findings.append(Finding(path, number, rule.name, raw, rule.detail))
    return findings


def scan(root: Path, paths: Iterable[Path] | None = None) -> list[Finding]:
    targets = list(paths) if paths is not None else list(shell_scripts(root))
    findings: list[Finding] = []
    for path in targets:
        relative = str(path.relative_to(root)) if path.is_absolute() else str(path)
        findings.extend(scan_text(path.read_text(encoding="utf-8"), relative))
    return findings


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    args = parser.parse_args(argv)

    findings = scan(args.root)
    scanned = len(list(shell_scripts(args.root)))
    if findings:
        print("PORTABILITY LINT FAILED — these do not mean the same thing on BSD and GNU:\n")
        for finding in findings:
            print(finding.render())
        print(
            f"\n{len(findings)} finding(s) across {scanned} script(s). "
            "Every one of these is green on a Mac and breaks on Linux CI, or the reverse. "
            "Waive a line only with a reason: # portability-ok: <why>"
        )
        return 1
    print(f"portability lint: {scanned} shell scripts, 0 findings ({len(RULES)} rules)")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
