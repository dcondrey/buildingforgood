"""The stdlib PDF reader, on PDFs built byte by byte in the test.

No fixture files: a PDF small enough to assert against is small enough to
construct, and constructing it means the test states what the format does
rather than trusting a binary nobody can read in review.
"""

from __future__ import annotations

import zlib

from stillhere_pipeline.pdftext import extract_text, find, has_text_layer


def pdf(*streams: bytes, compress: bool = True) -> bytes:
    """A file with the parts this reader looks at, and nothing else."""
    out = [b"%PDF-1.7\n"]
    for raw in streams:
        body = zlib.compress(raw) if compress else raw
        out.append(b"1 0 obj\n<< /Length %d >>\nstream\n" % len(body) + body + b"\nendstream\n")
    return b"".join(out)


def test_a_single_shown_string_comes_back() -> None:
    assert extract_text(pdf(b"BT (Personnel $582,079) Tj ET")) == "Personnel $582,079"


def test_a_kerned_array_is_rejoined_without_its_spacing_numbers() -> None:
    # [(Non)-250(Personnel)] TJ — the -250 is kerning, not content.
    assert extract_text(pdf(b"BT [(Non)-250(Personnel)] TJ ET")) == "NonPersonnel"


def test_escaped_parentheses_survive() -> None:
    assert extract_text(pdf(rb"BT (a \(b\) c) Tj ET")) == "a (b) c"


def test_whitespace_across_streams_is_collapsed() -> None:
    text = extract_text(pdf(b"BT (one) Tj ET", b"BT (two\n\n   three) Tj ET"))
    assert text == "one two three"


def test_a_stream_this_cannot_decompress_is_skipped_not_fatal() -> None:
    # An image stream, or any encoding other than Flate. The typed pages around
    # it must still come back.
    broken = pdf(b"BT (kept) Tj ET") + b"1 0 obj\nstream\n\xff\xd8\xff\xe0not-flate\nendstream\n"
    assert extract_text(broken) == "kept"


def test_a_scan_has_no_text_layer_and_a_contract_does() -> None:
    scan = pdf(b"\x89PNG-ish-pixels", compress=True)
    assert has_text_layer(scan) is False
    typed = pdf(b"BT (" + b"contract language " * 40 + b") Tj ET")
    assert has_text_layer(typed) is True


def test_find_returns_context_because_counting_is_how_this_goes_wrong() -> None:
    """The defect this function exists to prevent.

    A case-insensitive search for FTE matches the letters inside "after". Read
    as a count it says the term appears; read in context it plainly does not.
    """
    text = "the term shall continue after the date and thereafter as needed"
    assert len(find(text, r"FTE")) == 2, "the naive pattern matches inside 'after'"
    for hit in find(text, r"FTE"):
        assert "after" in hit or "thereafter" in hit
    assert find(text, r"\bFTE\b") == [], "bounded, the term is correctly absent"


def test_find_gives_enough_context_to_judge_a_number() -> None:
    text = "Scenario A: ((10.0 direct service FTE * $25/hours * 2080 hours/year) / $1,000,000)"
    (hit,) = find(text, r"\$25/hours")
    assert "Scenario A" in hit, "a rate-looking number must arrive with what qualifies it"
