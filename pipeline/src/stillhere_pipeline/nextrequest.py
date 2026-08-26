"""Read published documents out of a NextRequest public-records portal.

The source ledger described these as "manual authenticated download", which
overstated it: a Published request serves its documents over plain HTTP with a
session cookie and a referer, no account. That matters for provenance — a hash
in `checksums.sha256` anybody can reproduce is a stronger record than one
resting on somebody's browser session.

The portal is a Vue app over a JSON API. Two endpoints are enough:

* ``/client/documents?search_term=...`` — title search across the corpus. The
  parameter name matters and is not guessable: ``search``, ``q``, ``title`` and
  ``request_id`` are all accepted and all silently ignored, returning the
  unfiltered corpus. A caller who assumed one of those had filtered would be
  reading whichever 50 documents came back first.
* ``/documents/<id>/download`` — the file, which 403s unless the document's own
  page has been fetched first on the same session.
"""

from __future__ import annotations

import hashlib
import json
import re
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

#: San Diego *City*. The County runs a separate portal on the same platform, and
#: RTFH is a county-wide body, so a search that only asks the City is only asking
#: half the jurisdiction. Every function below takes `portal` for that reason.
PORTAL = "https://sandiego.nextrequest.com"
COUNTY_PORTAL = "https://pra.sandiegocounty.gov"
AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


@dataclass(frozen=True)
class Document:
    id: int
    title: str
    request: str

    @property
    def page(self) -> str:
        return f"{PORTAL}/documents/{self.id}"


def _get(url: str, referer: str | None = None, timeout: int = 180) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    if referer:
        request.add_header("Referer", referer)
    with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 - pinned host
        return bytes(response.read())


def search(term: str, limit: int = 25, portal: str = PORTAL) -> list[Document]:
    query = urllib.parse.urlencode({"search_term": term})
    payload = json.loads(_get(f"{portal}/client/documents?{query}"))
    out: list[Document] = []
    for row in payload.get("documents", [])[:limit]:
        out.append(
            Document(
                id=int(row["id"]),
                title=str(row.get("title", "")),
                request=str(row.get("pretty_id", "")),
            )
        )
    return out


def download(doc_id: int, portal: str = PORTAL) -> bytes:
    """The file. The page fetch first is not optional — the download 403s without it."""
    page = f"{portal}/documents/{doc_id}"
    _get(page)
    return _get(f"{page}/download", referer=page)


def pinned_hashes(root: Path, prefix: str = "") -> dict[str, str]:
    """`checksums.sha256` as basename to digest, optionally filtered by path prefix."""
    out: dict[str, str] = {}
    text = (root / "data/cards/checksums.sha256").read_text("utf-8")
    for line in text.splitlines():
        parts = line.split(None, 1)
        if len(parts) != 2:
            continue
        digest, path = parts[0], parts[1].strip()
        if prefix and prefix not in path:
            continue
        out[Path(path).name] = digest
    return out


def digest(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def best_match(name: str, candidates: list[Document]) -> Document | None:
    """The candidate whose title is the filename, else the closest by prefix.

    Titles on the portal carry the extension and sometimes differ from the
    pinned filename by a suffix a clerk added. Exact match is preferred and the
    fallback is deliberately narrow: guessing here would attach a hash to the
    wrong document, and a wrong hash is worse than no hash.
    """
    stem = _normalise(Path(name).stem)
    for candidate in candidates:
        if _normalise(Path(candidate.title).stem) == stem:
            return candidate
    for candidate in candidates:
        other = _normalise(Path(candidate.title).stem)
        # One is the other plus a clerk's suffix — "(executed)" against
        # "(executed agreement)". Require a long shared opening so that two
        # unrelated City filenames cannot satisfy it.
        if len(stem) >= 25 and (other.startswith(stem[:25]) or stem.startswith(other[:25])):
            return candidate
    return None


def _normalise(text: str) -> str:
    """Lowercase, strip punctuation, collapse runs — for comparing two titles."""
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def search_terms(name: str) -> list[str]:
    """Progressively less specific ways to ask for one document.

    The portal matches on `search_term` loosely, and a whole filename stem is
    often too specific to hit anything: the executed PATH contract is found by
    "10089902" and not by its own filename. So try the stem, then a truncation,
    then the distinctive tokens — an identifier carrying digits first, because
    RFP and PRA numbers are the least ambiguous thing in a City filename.
    """
    stem = Path(name).stem
    terms = [stem]
    if len(stem) > 40:
        terms.append(stem[:40].strip())
    with_digits = [
        t for t in re.split(r"[^A-Za-z0-9-]+", stem) if re.search(r"\d", t) and len(t) > 4
    ]
    terms.extend(sorted(with_digits, key=len, reverse=True)[:2])
    words = [t for t in re.split(r"[^A-Za-z]+", stem) if len(t) > 3]
    if len(words) >= 3:
        terms.append(" ".join(words[:4]))
    ordered: list[str] = []
    for term in terms:
        if term and term not in ordered:
            ordered.append(term)
    return ordered


def locate(name: str, limit: int = 25, portal: str = PORTAL) -> Document | None:
    """Find one pinned filename on the portal, trying each term until one hits."""
    for term in search_terms(name):
        found = best_match(name, search(term, limit=limit, portal=portal))
        if found is not None:
            return found
    return None
