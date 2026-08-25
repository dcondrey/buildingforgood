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
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

PORTAL = "https://sandiego.nextrequest.com"
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


def search(term: str, limit: int = 25) -> list[Document]:
    query = urllib.parse.urlencode({"search_term": term})
    payload = json.loads(_get(f"{PORTAL}/client/documents?{query}"))
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


def download(doc_id: int) -> bytes:
    """The file. The page fetch first is not optional — the download 403s without it."""
    page = f"{PORTAL}/documents/{doc_id}"
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
    stem = Path(name).stem.lower()
    for candidate in candidates:
        if Path(candidate.title).stem.lower() == stem:
            return candidate
    for candidate in candidates:
        if Path(candidate.title).stem.lower().startswith(stem[:40]):
            return candidate
    return None
