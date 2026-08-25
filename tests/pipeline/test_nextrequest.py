"""The portal client's pure parts, which are the parts that can be wrong quietly.

Search and download need the network and are exercised by running the survey.
What is tested here is the matching and the ledger reading, because those decide
which document a hash gets attached to — and a hash attached to the wrong
document is worse than no hash at all.
"""

from __future__ import annotations

from pathlib import Path

from stillhere_pipeline.nextrequest import Document, best_match, digest, pinned_hashes


def doc(title: str, id_: int = 1) -> Document:
    return Document(id=id_, title=title, request="24-3385")


def test_an_exact_title_wins_over_a_prefix() -> None:
    candidates = [
        doc("FY23 Executed_DSDP FRP (redacted).pdf", 1),
        doc("FY23 Executed_DSDP FRP.pdf", 2),
    ]
    found = best_match("FY23 Executed_DSDP FRP.pdf", candidates)
    assert found is not None and found.id == 2


def test_the_extension_does_not_have_to_agree() -> None:
    found = best_match("Maximum Shelter Capacity.pdf", [doc("Maximum Shelter Capacity.PDF")])
    assert found is not None


def test_an_unrelated_title_is_no_match_rather_than_the_closest_one() -> None:
    """The failure that matters: attaching a pinned hash to the wrong file."""
    assert (
        best_match("Executed_CityNet Outreach.pdf", [doc("Aztec Landscaping contract.pdf")]) is None
    )


def test_a_prefix_match_needs_forty_characters_of_agreement() -> None:
    # Long City filenames differ only in a clerk's suffix, so a prefix match is
    # allowed — but a short shared opening is not enough to identify a document.
    assert best_match("Contract A.pdf", [doc("Contract B.pdf")]) is None
    long_name = "Contract_RFP 10089902-22-F_PATH San Diego (executed).pdf"
    portal = "Contract_RFP 10089902-22-F_PATH San Diego (executed agreement).pdf"
    assert best_match(long_name, [doc(portal)]) is not None


def test_the_ledger_is_read_by_basename_and_can_be_filtered(tmp_path: Path) -> None:
    cards = tmp_path / "data" / "cards"
    cards.mkdir(parents=True)
    (cards / "checksums.sha256").write_text(
        "aaa  data/raw/pra_sandiego/24-3385/One.pdf\n"
        "bbb  data/raw/weather/Two.csv\n"
        "\n"
        "ccc  data/raw/pra_sandiego/Three.pdf\n",
        encoding="utf-8",
    )
    assert pinned_hashes(tmp_path) == {"One.pdf": "aaa", "Two.csv": "bbb", "Three.pdf": "ccc"}
    assert pinned_hashes(tmp_path, prefix="pra_sandiego") == {"One.pdf": "aaa", "Three.pdf": "ccc"}


def test_digest_is_the_sha256_the_ledger_records() -> None:
    # Fixed vector, so a change of algorithm cannot pass unnoticed.
    assert digest(b"").startswith("e3b0c44298fc1c14")


def test_search_terms_fall_back_from_the_whole_name_to_an_identifier() -> None:
    """The whole stem often finds nothing; the RFP number finds it.

    The executed PATH contract is not returned by a search for its own filename
    and is returned by a search for 10089902. Fifteen of thirty-six pinned
    documents went unfound on the first survey for exactly this reason.
    """
    from stillhere_pipeline.nextrequest import search_terms

    terms = search_terms("Contract_RFP 10089902-22-F_PATH San Diego (executed).pdf")
    assert terms[0].startswith("Contract_RFP")
    assert any("10089902" in term for term in terms), terms


def test_search_terms_never_repeat_a_query() -> None:
    from stillhere_pipeline.nextrequest import search_terms

    terms = search_terms("Short.pdf")
    assert len(terms) == len(set(terms))


def test_a_clerks_suffix_no_longer_defeats_the_match() -> None:
    portal = doc("Contract_RFP 10089902-22-F_PATH San Diego (executed agreement).pdf")
    assert best_match("Contract_RFP 10089902-22-F_PATH San Diego (executed).pdf", [portal])


def test_punctuation_differences_do_not_defeat_the_match() -> None:
    assert best_match("PRA #25-360 - ESD - Report.pdf", [doc("PRA 25 360   ESD  Report.pdf")])
