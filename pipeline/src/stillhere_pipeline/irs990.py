"""Fetch one Form 990 out of the IRS bulk archives without downloading them.

The compensation question needs Part IX lines 5 to 10 — officer compensation,
other salaries, pension contributions, other employee benefits, payroll taxes.
ProPublica's summary omits the pension and benefit lines, which is exactly the
half that matters, so the full return is the only source that settles it.

The IRS publishes full returns as XML inside annual bundles. The 2024 bundle
containing one San Diego filing is 977 MB; the filing itself is 72 KB. A ZIP
keeps its directory at the end and its members at known offsets, and
`apps.irs.gov` serves HTTP range requests, so a single return costs the
directory plus the member — about 14 MB rather than a gigabyte.

Two things that will bite anyone repeating this. The AWS `irs-form-990` bucket
still exists and is **empty**, so guessing object-id URLs returns 404 and looks
like a missing filing rather than a decommissioned mirror. And the index's
`XML_BATCH_ID` is lower-cased (`2024_TEOS_XML_05a`) while the published file is
upper-cased (`..._05A.zip`).
"""

from __future__ import annotations

import csv
import io
import struct
import urllib.request
import zlib
from dataclasses import dataclass

AGENT = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}
BASE = "https://apps.irs.gov/pub/epostcard/990/xml"


@dataclass(frozen=True)
class Filing:
    ein: str
    name: str
    tax_period: str
    object_id: str
    batch: str
    year: int

    @property
    def zip_url(self) -> str:
        # The index lower-cases the batch suffix; the published file upper-cases it.
        return f"{BASE}/{self.year}/{self.batch.upper()}.zip"

    @property
    def member(self) -> str:
        return f"{self.object_id}_public.xml"


def _fetch(url: str, byte_range: str | None = None, timeout: int = 240) -> bytes:
    headers = dict(AGENT)
    if byte_range:
        headers["Range"] = f"bytes={byte_range}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 - pinned host
        return bytes(response.read())


def index(year: int) -> list[Filing]:
    """Every filing the IRS published in one year. The index is ~90 MB."""
    raw = _fetch(f"{BASE}/{year}/index_{year}.csv").decode("utf-8", "replace")
    out: list[Filing] = []
    for row in csv.DictReader(io.StringIO(raw)):
        out.append(
            Filing(
                ein=str(row.get("EIN", "")),
                name=str(row.get("TAXPAYER_NAME", "")),
                tax_period=str(row.get("TAX_PERIOD", "")),
                object_id=str(row.get("OBJECT_ID", "")),
                batch=str(row.get("XML_BATCH_ID", "")),
                year=year,
            )
        )
    return out


def fetch_return(filing: Filing) -> bytes:
    """The filing's XML, pulled from its bundle by range request."""
    url = filing.zip_url
    tail = _fetch(url, "-65536")
    eocd = tail.rfind(b"PK\x05\x06")
    if eocd == -1:
        raise ValueError(f"{url}: no end-of-central-directory in the tail")
    cd_size, cd_offset = struct.unpack("<II", tail[eocd + 12 : eocd + 20])

    directory = _fetch(url, f"{cd_offset}-{cd_offset + cd_size - 1}")
    at = directory.find(filing.member.encode())
    if at == -1:
        raise ValueError(f"{filing.member} is not in {url}")
    start = directory.rfind(b"PK\x01\x02", 0, at)
    header = directory[start : start + 46]
    compressed = struct.unpack("<I", header[20:24])[0]
    local_offset = struct.unpack("<I", header[42:46])[0]

    # The local header's own name and extra lengths are the only reliable way to
    # find where the data starts; the central directory's copies can differ.
    block = _fetch(url, f"{local_offset}-{local_offset + 30 + 4096 + compressed}")
    name_len, extra_len = struct.unpack("<HH", block[26:30])
    begin = 30 + name_len + extra_len
    return zlib.decompress(block[begin : begin + compressed], -15)


#: Form 990 Part IX, the compensation block. Wages and the loading on top of
#: them, kept apart because the whole question is the ratio between the two.
WAGE_TAGS = (
    "CompCurrentOfcrDirectorsGrp",
    "CompDisqualPersonsGrp",
    "OtherSalariesAndWagesGrp",
)
LOADING_TAGS = (
    "PensionPlanContributionsGrp",
    "OtherEmployeeBenefitsGrp",
    "PayrollTaxesGrp",
)


def compensation(xml: bytes) -> dict[str, int]:
    """Part IX totals by line, zeros included.

    A zero is information here rather than an absence: one San Diego filer
    reports no pension and no employee benefits and puts everything above wages
    into payroll taxes, which is what makes their payroll-tax line look twice
    the size of everyone else's.
    """
    from xml.etree import ElementTree as ET

    ns = {"e": "http://www.irs.gov/efile"}
    root = ET.fromstring(xml)
    out: dict[str, int] = {}
    for tag in WAGE_TAGS + LOADING_TAGS:
        node = root.find(f".//e:{tag}/e:TotalAmt", ns)
        out[tag] = int(node.text) if node is not None and node.text else 0
    return out


def loading_ratio(part_ix: dict[str, int]) -> float | None:
    """Total compensation divided by wages, or None when wages are missing.

    Flex credits, allowances and anything else paid to the employee belong in
    the denominator. Counting them in the total and not in the base is how a
    1.19 becomes a 1.35 — the arithmetic runs cleanly and the answer is wrong by
    a sixth.
    """
    wages = sum(part_ix.get(tag, 0) for tag in WAGE_TAGS)
    if wages <= 0:
        return None
    return (wages + sum(part_ix.get(tag, 0) for tag in LOADING_TAGS)) / wages
