"""Read text out of a PDF with the standard library only.

The digitization work already depends on OCR for scans. This is the other half:
a contract that was typed rather than scanned carries its text in the file, and
reading it needs no OCR, no network, and no dependency — which matters, because
the alternative was pasting the same regex into a second throwaway script.

It is deliberately small. It decompresses content streams and pulls the operands
of the text-showing operators, which is enough to search a contract for a number
and to tell a typed document from a scanned one. It does not lay out pages,
resolve fonts, decode CID or non-Latin encodings, or preserve reading order
across columns. Anything that needs those needs a real PDF library, and this
module should not grow into one.

`has_text_layer` is the useful question for triage: a scanned document returns
almost nothing here and belongs in the OCR path instead.
"""

from __future__ import annotations

import re
import zlib

_STREAM = re.compile(rb"stream\r?\n(.*?)endstream", re.S)
#: `(...) Tj` shows one string; `[...] TJ` shows an array of strings with
#: kerning numbers between them, which are discarded.
_SHOW = re.compile(rb"\[((?:[^\[\]\\]|\\.)*)\]\s*TJ|\(((?:[^()\\]|\\.)*)\)\s*Tj")
_LITERAL = re.compile(rb"\(((?:[^()\\]|\\.)*)\)")

#: PDF escapes inside a literal string. `\(`, `\)` and `\\` are the ones that
#: change meaning; the rest are whitespace forms.
_ESCAPES = {
    rb"\(": b"(",
    rb"\)": b")",
    rb"\\": b"\\",
    rb"\n": b"\n",
    rb"\r": b"\r",
    rb"\t": b"\t",
}


def _unescape(raw: bytes) -> bytes:
    for pattern, replacement in _ESCAPES.items():
        raw = raw.replace(pattern, replacement)
    return raw


def extract_text(pdf: bytes) -> str:
    """Every text-showing operand in the file, whitespace collapsed.

    Order follows the order of content streams, which for a linear typed
    document is close enough to reading order to search. It is not a layout.
    """
    pieces: list[str] = []
    for compressed in _STREAM.findall(pdf):
        try:
            content = zlib.decompress(compressed)
        except zlib.error:
            continue  # not Flate — an image, or an encoding this cannot read
        for match in _SHOW.finditer(content):
            array, single = match.group(1), match.group(2)
            strings = _LITERAL.findall(array) if array is not None else [single or b""]
            pieces.append(b"".join(_unescape(s) for s in strings).decode("latin-1"))
    return re.sub(r"\s+", " ", " ".join(pieces)).strip()


def has_text_layer(pdf: bytes, *, minimum: int = 200) -> bool:
    """Whether this is a typed document rather than a scan.

    A scanned page carries its words as pixels, so almost nothing comes back.
    The threshold is generous on purpose: a typed document that only reaches a
    couple of hundred characters is one worth looking at by hand either way.
    """
    return len(extract_text(pdf)) >= minimum


def find(text: str, pattern: str, *, window: int = 200) -> list[str]:
    """Matches with surrounding context, for reading rather than counting.

    Counting is how a search goes wrong here: a case-insensitive `FTE` matches
    inside "after", which is exactly how a first pass through a City contract
    reported sixteen mentions of a term that appears nowhere in it.
    """
    out: list[str] = []
    for match in re.finditer(pattern, text, re.I):
        start = max(0, match.start() - window)
        out.append(text[start : match.end() + window].strip())
    return out
