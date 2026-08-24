"""The claim inventory: every adopter-facing claim, and what backs it.

Run it::

    python -m stillhere_pipeline.claims            # print the inventory
    python -m stillhere_pipeline.claims --check    # exit non-zero on a failure

``scripts/verify.sh`` runs ``--check``. The registry is
``docs/adoption/CLAIMS.yaml`` and that file explains why this exists.

Seven checks, in the order they run:

1. **The quote is present.** Every claim's quote must appear verbatim in every
   surface it names. A document edited past its claim fails here, which is the
   check that would have caught the CHANGELOG naming a profile that had been
   deleted.
2. **Something backs it.** Every claim declares ``code``, ``tests``, or
   ``limitation``. A claim with none of the three fails — that is the rule the
   whole file exists to enforce.
3. **The backing exists.** Every declared path must exist and contain its
   anchor. Deleting the function a claim rests on fails here rather than in a
   room with a funder.
4. **The limitation is disclosed.** A claim bounded by a limitation must point
   at a document that actually states it.
5. **Withdrawn claims stay withdrawn.** A phrase this project retracted must not
   reappear on a surface except inside a passage explaining the retraction.
6. **The skip ledger reconciles.** Every distinct pytest skip reason is
   registered against a limitation, and the total is declared. A green suite
   that quietly stopped covering something fails here.
7. **A machine-readable declaration and the claim it bounds stay in step.**
   Some limitations are a data file rather than a paragraph. A declaration
   states what has been demonstrated and, at greater length, what has not; this
   check holds the two together, so the evidence cannot grow, and the bounds
   cannot shrink, without the claim moving with them.

Deliberately not clever. It matches literal strings, because the failure mode it
exists to catch is a sentence drifting away from the thing that made it true,
and a fuzzy matcher would drift with it.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

REGISTRY_DEFAULT = Path("docs/adoption/CLAIMS.yaml")
TEST_ROOT_DEFAULT = Path("tests")

# Skip reasons, two ways.
#
# Statically, out of the test sources, so the check works when the suite has not
# been run. This finds every reason string but cannot count skips: eleven of the
# fourteen come from two `pytest.skip` calls in shared guard clauses, so source
# occurrences and runtime skips are different numbers and only the second is the
# coverage an operator actually loses.
#
# So the counts are reconciled against pytest's own `-rs` summary when
# `scripts/verify.sh` supplies it. Absent that, the reason set is still checked
# and the report says the counts were not reconciled rather than implying they
# were.
SKIP_REASON_PATTERN = re.compile(
    r"""pytest\.skip\(\s*["']([^"']+)["']|reason=\s*["']([^"']+)["']"""
)
PYTEST_SKIP_LINE = re.compile(r"^SKIPPED \[(\d+)\]\s+[^:]+:\d+:\s*(.+?)\s*$", re.MULTILINE)


class ClaimError(Exception):
    """The registry itself is malformed, as distinct from a failing claim."""


@dataclass
class Finding:
    claim_id: str
    check: str
    detail: str


@dataclass
class Report:
    findings: list[Finding] = field(default_factory=list)
    claims_checked: int = 0
    anchors_checked: int = 0
    skips_registered: int = 0
    skips_reconciled: bool = False
    declarations_checked: int = 0

    @property
    def ok(self) -> bool:
        return not self.findings

    def fail(self, claim_id: str, check: str, detail: str) -> None:
        self.findings.append(Finding(claim_id, check, detail))


def _read(root: Path, relative: str) -> str | None:
    path = root / relative
    if not path.is_file():
        return None
    return path.read_text(encoding="utf-8")


def _normalize(text: str) -> str:
    """Collapse whitespace so a quote survives reflowing a Markdown paragraph.

    Line wrapping is a formatting decision that changes where the newlines fall
    without changing the sentence. Matching on collapsed whitespace means a
    `prettier` pass does not read as a withdrawn claim, while any change to the
    words still does.
    """
    return re.sub(r"\s+", " ", text)


def _contains(haystack: str, needle: str, *, case_sensitive: bool = True) -> bool:
    hay, need = _normalize(haystack), _normalize(needle)
    if not case_sensitive:
        hay, need = hay.lower(), need.lower()
    return need in hay


def check_registry(
    root: Path,
    registry_path: Path,
    test_root: Path,
    pytest_summary: Path | None = None,
) -> Report:
    raw = registry_path.read_text(encoding="utf-8")
    data: dict[str, Any] = yaml.safe_load(raw)
    if data.get("version") != "claims/v1":
        raise ClaimError(f"unsupported registry version: {data.get('version')!r}")

    surfaces: list[str] = list(data.get("surfaces") or [])
    if not surfaces:
        raise ClaimError("registry declares no surfaces")
    surface_text: dict[str, str] = {}
    for surface in surfaces:
        text = _read(root, surface)
        if text is None:
            raise ClaimError(f"declared surface does not exist: {surface}")
        surface_text[surface] = text

    report = Report()
    claims: list[dict[str, Any]] = list(data.get("claims") or [])
    if not claims:
        raise ClaimError("registry declares no claims")

    claim_ids = {claim["id"] for claim in claims}

    for claim in claims:
        report.claims_checked += 1
        cid = claim["id"]
        case_sensitive = bool(claim.get("quote_case_sensitive", True))

        # 1. the quote is present on every surface the claim names
        named = list(claim.get("surfaces") or [])
        for surface in named:
            if surface not in surface_text:
                report.fail(cid, "surface", f"{surface} is not a declared surface")
                continue
            if not _contains(surface_text[surface], claim["quote"], case_sensitive=case_sensitive):
                report.fail(
                    cid,
                    "quote",
                    f"{surface} no longer contains the claim's quote — "
                    f"the document moved and the claim did not: {claim['quote']!r}",
                )

        # 2. something backs it
        code = list(claim.get("code") or [])
        tests = list(claim.get("tests") or [])
        limitation = claim.get("limitation")
        if not code and not tests and not limitation:
            report.fail(
                cid,
                "unbacked",
                "claim declares no code, no tests, and no limitation. "
                "Every claim must be backed by shipped code or listed as a limitation.",
            )

        # 3. the backing exists, and still contains its anchor
        for kind, entries in (("code", code), ("tests", tests)):
            for entry in entries:
                report.anchors_checked += 1
                relative = entry["path"]
                text = _read(root, relative)
                if text is None:
                    report.fail(cid, kind, f"{relative} does not exist")
                    continue
                anchor = entry.get("anchor", "")
                if anchor and not _contains(text, anchor):
                    report.fail(
                        cid,
                        kind,
                        f"{relative} no longer contains {anchor!r} — "
                        "the claim outlived the code that backed it",
                    )

        # 4. the limitation is actually disclosed where it says it is
        if limitation:
            relative = limitation["surface"]
            text = _read(root, relative)
            if text is None:
                report.fail(cid, "limitation", f"{relative} does not exist")
            elif not _contains(text, limitation["quote"]):
                report.fail(
                    cid,
                    "limitation",
                    f"{relative} does not state the limitation this claim is bounded by: "
                    f"{limitation['quote']!r}",
                )

    # 5. withdrawn claims stay withdrawn
    for withdrawn in data.get("withdrawn") or []:
        wid = withdrawn["id"]
        replaced_by = withdrawn.get("replaced_by")
        if replaced_by and replaced_by not in claim_ids:
            raise ClaimError(f"{wid} is replaced_by {replaced_by!r}, which is not a claim")
        phrase = withdrawn["phrase"]
        permitted = [_normalize(p).lower() for p in (withdrawn.get("permitted_context") or [])]
        for surface, text in surface_text.items():
            for line_no, occurrence in _occurrences(text, phrase):
                if any(allowed in _normalize(occurrence).lower() for allowed in permitted):
                    continue
                report.fail(
                    wid,
                    "withdrawn",
                    f"{surface}:{line_no} states a withdrawn claim outside a passage "
                    f"explaining the withdrawal: {phrase!r}",
                )

    # 6. the skip ledger reconciles with the test sources
    _check_skips(root, test_root, data, report, pytest_summary)

    # 7. machine-readable declarations still say what their claim rests on
    _check_declarations(root, data, report)

    return report


def _occurrences(text: str, phrase: str) -> list[tuple[int, str]]:
    """Every line carrying the phrase, with a window of context around it.

    The window is the surrounding paragraph, because the permitted contexts are
    sentences like `Not "<phrase>."` that wrap across a line break.
    """
    normalized_phrase = _normalize(phrase).lower()
    lines = text.splitlines()
    hits: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        window = " ".join(lines[max(0, index - 2) : index + 3])
        if normalized_phrase in _normalize(line).lower() or (
            normalized_phrase in _normalize(window).lower()
            and normalized_phrase
            not in _normalize(" ".join(lines[max(0, index - 2) : index + 2])).lower()
        ):
            hits.append((index + 1, window))
    # A phrase spanning a line break is reported once, at its first line.
    deduped: list[tuple[int, str]] = []
    for line_no, window in hits:
        if deduped and line_no - deduped[-1][0] <= 2:
            continue
        deduped.append((line_no, window))
    return deduped


def _check_skips(
    root: Path,
    test_root: Path,
    data: dict[str, Any],
    report: Report,
    pytest_summary: Path | None = None,
) -> None:
    ledger = data.get("skipped_tests") or {}
    registered = {entry["reason"]: entry for entry in ledger.get("reasons") or []}
    claim_ids = {claim["id"] for claim in data.get("claims") or []}

    for reason, entry in registered.items():
        limitation = entry.get("limitation")
        if limitation not in claim_ids:
            raise ClaimError(
                f"skip reason {reason!r} is attributed to {limitation!r}, which is not a claim"
            )

    # Static pass: every reason string in the sources is registered, and every
    # registered reason still exists somewhere.
    #
    # `scan_excludes` exists for one narrow case: a test whose subject is this
    # checker writes skip calls as fixture data, and a regex cannot tell those
    # from real ones. Each exclusion is listed in the registry with a reason,
    # because an invisible exclusion here would defeat the whole ledger.
    excludes = {str(name) for name in (ledger.get("scan_excludes") or [])}
    found: set[str] = set()
    search_root = root / test_root
    for path in sorted(search_root.rglob("*.py")) if search_root.is_dir() else []:
        if str(path.relative_to(root)) in excludes:
            continue
        for match in SKIP_REASON_PATTERN.finditer(path.read_text(encoding="utf-8")):
            found.add(match.group(1) or match.group(2))

    for reason in sorted(found - set(registered)):
        report.fail(
            "skipped_tests",
            "skip",
            f"a test skips with an unregistered reason: {reason!r}. "
            "Register it against the limitation that makes the gap acceptable, "
            "so the coverage a green suite does not buy stays visible.",
        )
    for reason in sorted(set(registered) - found):
        report.fail(
            "skipped_tests",
            "skip",
            f"registered skip reason no longer appears in any test: {reason!r}. "
            "If the gap closed, delete the entry and say so.",
        )

    declared_total = ledger.get("expected_total")
    counted = sum(entry.get("count", 0) for entry in ledger.get("reasons") or [])
    report.skips_registered = counted
    if declared_total is not None and declared_total != counted:
        report.fail(
            "skipped_tests",
            "skip",
            f"the ledger declares {declared_total} skipped tests but its reasons sum to {counted}",
        )

    # Runtime pass: reconcile the declared counts against what pytest actually
    # skipped. Only this pass can tell the difference between "the ledger is
    # stale" and "the ledger is right".
    if pytest_summary is None:
        report.skips_reconciled = False
        return
    # Asking for reconciliation and not getting it is a failure, not a shrug.
    # `scripts/verify.sh` writes the summary through a pipe into a temporary
    # file; if that ever breaks, the ledger would stop asserting anything while
    # the gate kept printing green, which is the failure this file exists for.
    if not pytest_summary.is_file():
        report.skips_reconciled = False
        report.fail(
            "skipped_tests",
            "skip",
            f"--pytest-summary named {pytest_summary} and no such file exists. The declared "
            "skip counts went unreconciled while the run asked for them to be checked.",
        )
        return
    report.skips_reconciled = True
    actual: dict[str, int] = {}
    for count, reason in PYTEST_SKIP_LINE.findall(pytest_summary.read_text(encoding="utf-8")):
        actual[reason] = actual.get(reason, 0) + int(count)
    if not actual and declared_total:
        report.fail(
            "skipped_tests",
            "skip",
            f"{pytest_summary} carries no SKIPPED lines, and the ledger declares "
            f"{declared_total} skipped tests. Run pytest with -rs, or the reconciliation "
            "is reading an empty file and passing.",
        )
        return

    for reason, count in sorted(actual.items()):
        entry = registered.get(reason)
        if entry is None:
            report.fail(
                "skipped_tests",
                "skip",
                f"pytest skipped {count} test(s) for an unregistered reason: {reason!r}",
            )
        elif entry.get("count") != count:
            report.fail(
                "skipped_tests",
                "skip",
                f"the ledger records {entry.get('count')} skip(s) for {reason!r} "
                f"but pytest skipped {count}",
            )
    actual_total = sum(actual.values())
    if declared_total is not None and actual_total != declared_total:
        report.fail(
            "skipped_tests",
            "skip",
            f"the ledger declares {declared_total} skipped tests but pytest skipped {actual_total}",
        )


def _check_declarations(root: Path, data: dict[str, Any], report: Report) -> None:
    """Hold a claim and the machine-readable declaration that bounds it together.

    A prose limitation is checked by matching a sentence. Some limitations are
    not prose: ``config/portability-demonstrated.v1.json`` is a data file that
    says which two profiles portability was actually shown on and enumerates
    what was not shown. Two things can drift there, in opposite directions. The
    evidence can grow — a third profile appears in the declaration while the
    claim it bounds still rests on the original two. Or the bounds can shrink —
    an entry disappears from ``not_demonstrated``, or a phrase disappears from
    ``forbidden_claims``, and the claim silently widens without a word of it
    changing. Neither shows up as a failing sentence, so neither is caught by
    checks 1 through 5.

    The counts here are declared in the registry on purpose. Asserting "five
    bounds" means removing one is a decision someone has to write down, which is
    the whole mechanism: not that the number is five, but that changing it is
    visible.
    """
    claims_by_id = {claim["id"]: claim for claim in data.get("claims") or []}
    for declaration in data.get("declarations") or []:
        report.declarations_checked += 1
        did = declaration["id"]
        cid = declaration["claim"]
        claim = claims_by_id.get(cid)
        if claim is None:
            raise ClaimError(f"declaration {did!r} bounds {cid!r}, which is not a claim")

        relative = declaration["path"]
        raw = _read(root, relative)
        if raw is None:
            report.fail(cid, "declaration", f"{relative} does not exist — the claim is unbounded")
            continue
        try:
            document = json.loads(raw)
        except json.JSONDecodeError as error:
            report.fail(cid, "declaration", f"{relative} is not valid JSON: {error}")
            continue

        expected_version = declaration.get("version")
        actual_version = document.get("declaration_version")
        if expected_version and actual_version != expected_version:
            report.fail(
                cid,
                "declaration",
                f"{relative} declares version {actual_version!r}, and this claim is written "
                f"against {expected_version!r}",
            )

        # The declaration's own sentence, verbatim, wherever it says it is stated.
        sentence = str(document.get("claim") or "").strip()
        if not sentence:
            report.fail(cid, "declaration", f"{relative} states no claim of its own")
        else:
            for surface in document.get("claim_surfaces") or []:
                surface_text = _read(root, surface)
                if surface_text is None:
                    report.fail(
                        cid,
                        "declaration",
                        f"{relative} names a surface that does not exist: {surface}",
                    )
                elif not _contains(surface_text, sentence):
                    report.fail(
                        cid,
                        "declaration",
                        f"{surface} no longer states the declaration's claim verbatim: "
                        f"{sentence!r}",
                    )

        # Every piece of evidence the declaration rests on must also back the claim.
        claim_paths = {entry["path"] for entry in claim.get("code") or []}
        evidence = declaration.get("evidence_key", "demonstrated_on")
        demonstrated = list(document.get(evidence) or [])
        expected_count = declaration.get("evidence_count")
        if expected_count is not None and len(demonstrated) != expected_count:
            report.fail(
                cid,
                "declaration",
                f"{relative} lists {len(demonstrated)} item(s) under {evidence!r} and the registry "
                f"expects {expected_count}. Evidence changed; say what the claim now covers.",
            )
        for entry in demonstrated:
            path = entry.get("path")
            if not path:
                continue
            if _read(root, path) is None:
                report.fail(cid, "declaration", f"{relative} cites {path}, which does not exist")
            elif path not in claim_paths:
                report.fail(
                    cid,
                    "declaration",
                    f"{relative} rests on {path} and the claim it bounds does not list it under "
                    "`code:`. The declaration and the claim are describing different evidence.",
                )

        # The bounds. These may only be removed deliberately.
        bounds_key = declaration.get("bounds_key", "not_demonstrated")
        bounds = document.get(bounds_key) or {}
        expected_bounds = declaration.get("bounds_count")
        if expected_bounds is not None and len(bounds) != expected_bounds:
            report.fail(
                cid,
                "declaration",
                f"{relative} lists {len(bounds)} entries under {bounds_key!r} and the registry "
                f"expects {expected_bounds}. A bound was added or removed; a removed one widens "
                "the claim without changing a word of it.",
            )
        for name, statement in sorted(bounds.items()):
            if not str(statement).strip():
                report.fail(
                    cid,
                    "declaration",
                    f"{relative} names the bound {name!r} and says nothing about it",
                )

        minimum = declaration.get("forbidden_phrases_min")
        if minimum is not None:
            phrases = list((document.get("forbidden_claims") or {}).get("phrases") or [])
            if len(phrases) < minimum:
                report.fail(
                    cid,
                    "declaration",
                    f"{relative} forbids {len(phrases)} phrase(s) and the registry expects at "
                    f"least {minimum}. Phrases are added when an overclaim is caught; one is "
                    "never removed to make a sentence pass.",
                )

        for key in declaration.get("require_keys") or []:
            if not document.get(key):
                report.fail(cid, "declaration", f"{relative} no longer records {key!r}")

        for entry in declaration.get("enforced_by") or []:
            report.anchors_checked += 1
            path = entry["path"]
            text = _read(root, path)
            if text is None:
                report.fail(
                    cid, "declaration", f"{path} does not exist — nothing reads this declaration"
                )
                continue
            anchor = entry.get("anchor", "")
            if anchor and not _contains(text, anchor):
                report.fail(
                    cid,
                    "declaration",
                    f"{path} no longer contains {anchor!r} — "
                    "the declaration is a file nobody checks",
                )


def render(root: Path, registry_path: Path, report: Report) -> str:
    data: dict[str, Any] = yaml.safe_load(registry_path.read_text(encoding="utf-8"))
    lines: list[str] = []
    lines.append("CLAIM INVENTORY — every adopter-facing claim and what backs it")
    lines.append("")
    for claim in data.get("claims") or []:
        backing: list[str] = []
        for entry in claim.get("code") or []:
            anchor = entry.get("anchor") or ""
            backing.append(f"code  {entry['path']}" + (f" :: {anchor}" if anchor else ""))
        for entry in claim.get("tests") or []:
            anchor = entry.get("anchor") or ""
            backing.append(f"test  {entry['path']}" + (f" :: {anchor}" if anchor else ""))
        if claim.get("limitation"):
            backing.append(f"limit {claim['limitation']['surface']}")
        failed = [f for f in report.findings if f.claim_id == claim["id"]]
        mark = "FAIL" if failed else "ok"
        lines.append(f"[{mark:>4}] {claim['id']}")
        lines.append(f"        {' '.join(str(claim['claim']).split())}")
        lines.append(f"        stated in: {', '.join(claim.get('surfaces') or ['(nowhere)'])}")
        for item in backing or ["(nothing — this claim is unbacked)"]:
            lines.append(f"        {item}")
        for finding in failed:
            lines.append(f"        !! {finding.check}: {finding.detail}")
        lines.append("")

    lines.append("WITHDRAWN — must not reappear outside a passage explaining the withdrawal")
    for withdrawn in data.get("withdrawn") or []:
        failed = [f for f in report.findings if f.claim_id == withdrawn["id"]]
        mark = "FAIL" if failed else "ok"
        lines.append(f'[{mark:>4}] {withdrawn["id"]}: "{withdrawn["phrase"]}"')
        for finding in failed:
            lines.append(f"        !! {finding.detail}")
    lines.append("")

    ledger = data.get("skipped_tests") or {}
    total = ledger.get("expected_total", "?")
    lines.append(f"COVERAGE NOT BOUGHT — {total} Python tests skip on a clean checkout")
    for entry in ledger.get("reasons") or []:
        lines.append(f"        {entry['count']:>3}x {entry['reason']}")
        lines.append(f"             bounded by: {entry['limitation']}")
    if not report.skips_reconciled:
        lines.append(
            "        (counts declared, not reconciled — pass --pytest-summary to check them"
            " against a real run)"
        )
    skip_failures = [f for f in report.findings if f.claim_id == "skipped_tests"]
    for finding in skip_failures:
        lines.append(f"        !! {finding.detail}")
    lines.append("")

    declarations = data.get("declarations") or []
    if declarations:
        lines.append("DECLARED BOUNDS — a limitation held in a data file rather than a paragraph")
        for declaration in declarations:
            lines.append(f"        {declaration['path']}")
            lines.append(f"             bounds: {declaration['claim']}")
        lines.append("")

    lines.append(
        f"{report.claims_checked} claims, {report.anchors_checked} anchors, "
        f"{report.skips_registered} registered skips, "
        f"{report.declarations_checked} declarations"
    )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--check", action="store_true", help="exit non-zero on any failing claim")
    parser.add_argument("--quiet", action="store_true", help="print only failures")
    parser.add_argument("--root", type=Path, default=Path("."), help="repository root")
    parser.add_argument("--registry", type=Path, default=REGISTRY_DEFAULT)
    parser.add_argument("--tests", type=Path, default=TEST_ROOT_DEFAULT)
    parser.add_argument(
        "--pytest-summary",
        type=Path,
        default=None,
        help="output of `pytest -rs`, so declared skip counts are reconciled against real ones",
    )
    args = parser.parse_args(argv)

    registry_path = args.root / args.registry
    try:
        report = check_registry(args.root, registry_path, args.tests, args.pytest_summary)
    except ClaimError as error:
        print(f"CLAIM REGISTRY INVALID: {error}", file=sys.stderr)
        return 2

    if not args.quiet:
        print(render(args.root, registry_path, report))

    if report.ok:
        print("CLAIM INVENTORY PASSED")
        return 0

    print("", file=sys.stderr)
    for finding in report.findings:
        print(
            f"CLAIM FAILED [{finding.claim_id}] {finding.check}: {finding.detail}", file=sys.stderr
        )
    print(f"\n{len(report.findings)} failing claim checks.", file=sys.stderr)
    return 1 if args.check else 0


if __name__ == "__main__":
    raise SystemExit(main())
