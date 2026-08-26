"""Part IX parsing, on a return built in the test.

The network parts — the index and the ranged ZIP read — are exercised by running
the analysis. What is pinned here is the arithmetic, because the arithmetic is
what went wrong: a loading ratio computed with an allowance in the numerator and
not the denominator ran cleanly and was wrong by a sixth.
"""

from __future__ import annotations

from stillhere_pipeline.irs990 import Filing, compensation, loading_ratio

NS = 'xmlns="http://www.irs.gov/efile"'


def ret(**lines: int) -> bytes:
    body = "".join(f"<{tag}><TotalAmt>{amount}</TotalAmt></{tag}>" for tag, amount in lines.items())
    return f'<?xml version="1.0"?><Return {NS}><ReturnData>{body}</ReturnData></Return>'.encode()


def test_every_part_ix_line_is_read() -> None:
    part_ix = compensation(
        ret(
            CompCurrentOfcrDirectorsGrp=749288,
            OtherSalariesAndWagesGrp=15897497,
            PayrollTaxesGrp=3115186,
        )
    )
    assert part_ix["CompCurrentOfcrDirectorsGrp"] == 749288
    assert part_ix["OtherSalariesAndWagesGrp"] == 15897497
    assert part_ix["PayrollTaxesGrp"] == 3115186


def test_an_absent_line_reads_as_zero_because_zero_is_the_finding() -> None:
    """One San Diego filer reports no pension and no benefits at all.

    Treating those as missing rather than zero would hide why that filer\'s
    payroll-tax line looks twice the size of everyone else\'s.
    """
    part_ix = compensation(ret(OtherSalariesAndWagesGrp=100))
    assert part_ix["PensionPlanContributionsGrp"] == 0
    assert part_ix["OtherEmployeeBenefitsGrp"] == 0


def test_the_loading_ratio_counts_wages_in_the_denominator() -> None:
    # The real filing: 16,646,785 of wages and comp, 3,115,186 of loading.
    part_ix = compensation(
        ret(
            CompCurrentOfcrDirectorsGrp=749288,
            OtherSalariesAndWagesGrp=15897497,
            PayrollTaxesGrp=3115186,
        )
    )
    ratio = loading_ratio(part_ix)
    assert ratio is not None
    assert round(ratio, 3) == 1.187


def test_officer_compensation_belongs_in_the_base_not_the_loading() -> None:
    """Moving it to the numerator inflates the ratio, which is the error class."""
    both = loading_ratio(compensation(ret(OtherSalariesAndWagesGrp=1000, PayrollTaxesGrp=100)))
    with_officer = loading_ratio(
        compensation(
            ret(OtherSalariesAndWagesGrp=900, CompCurrentOfcrDirectorsGrp=100, PayrollTaxesGrp=100)
        )
    )
    assert both == with_officer == 1.1


def test_a_return_with_no_wages_has_no_ratio_rather_than_a_divide_by_zero() -> None:
    assert loading_ratio(compensation(ret(PayrollTaxesGrp=500))) is None


def test_the_batch_suffix_is_upper_cased_for_the_published_file() -> None:
    """The index says 05a and the file is 05A. That cost an hour."""
    filing = Filing(
        ein="330215585",
        name="ALPHA PROJECT FOR THE HOMELESS",
        tax_period="202306",
        object_id="202411359349306146",
        batch="2024_TEOS_XML_05a",
        year=2024,
    )
    assert filing.zip_url.endswith("2024_TEOS_XML_05A.zip")
    assert filing.member == "202411359349306146_public.xml"
