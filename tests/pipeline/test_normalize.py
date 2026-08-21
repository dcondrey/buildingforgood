import pytest

from stillhere_pipeline.normalize import (
    NormalizationError,
    normalize_label,
    normalize_month,
    normalize_records,
    normalize_type,
)


def raw_row(**overrides: str) -> dict[str, str]:
    row = {
        "file_id": "f1",
        "neighborhood": "east_village",
        "date": "2018-01-24",
        "count": "5",
        "type": "Individual",
        "x": "6282334.08",
        "y": "1837657.17",
    }
    row.update(overrides)
    return row


class TestNormalizeLabel:
    def test_snake_case_labels_pass_through(self) -> None:
        assert normalize_label("east_village") == "east_village"

    def test_title_case_labels_canonicalize(self) -> None:
        assert normalize_label("Barrio Logan") == "barrio_logan"
        assert normalize_label("Sherman Height") == "sherman_heights"

    def test_core_is_an_era_alias_of_city_center(self) -> None:
        assert normalize_label("core") == "city_center"
        assert normalize_label("City Center") == "city_center"

    def test_unknown_label_fails_closed(self) -> None:
        with pytest.raises(NormalizationError, match="neighborhood"):
            normalize_label("hillcrest")


class TestNormalizeType:
    def test_named_era_types(self) -> None:
        assert normalize_type("Individual") == "individual"
        assert normalize_type("Structure") == "structure"
        assert normalize_type("Vehicle") == "vehicle"

    def test_numeric_era_codes(self) -> None:
        assert normalize_type("1") == "individual"
        assert normalize_type("2") == "structure"
        assert normalize_type("3") == "vehicle"

    def test_unknown_type_fails_closed(self) -> None:
        with pytest.raises(NormalizationError, match="type"):
            normalize_type("4")


class TestNormalizeMonth:
    def test_truncates_unreliable_day(self) -> None:
        assert normalize_month("2018-01-24") == "2018-01"

    def test_rejects_malformed_date(self) -> None:
        with pytest.raises(NormalizationError, match="date"):
            normalize_month("Jan 2018")

    def test_rejects_out_of_range_month(self) -> None:
        with pytest.raises(NormalizationError, match="date"):
            normalize_month("2018-13-01")


class TestNormalizeRecords:
    def test_normalizes_a_clean_row(self) -> None:
        result = normalize_records([raw_row()])
        assert len(result.records) == 1
        rec = result.records[0]
        assert (rec.neighborhood, rec.month, rec.type, rec.count) == (
            "east_village",
            "2018-01",
            "individual",
            5,
        )

    def test_drops_exact_duplicates_and_counts_them(self) -> None:
        result = normalize_records([raw_row(), raw_row()])
        assert len(result.records) == 1
        assert result.duplicates_dropped == 1

    def test_near_duplicates_are_kept(self) -> None:
        result = normalize_records([raw_row(), raw_row(x="6282335.00")])
        assert len(result.records) == 2
        assert result.duplicates_dropped == 0

    def test_rejects_negative_count(self) -> None:
        result = normalize_records([raw_row(count="-1")])
        assert result.records == []
        assert result.invalid_rows[0].reason.startswith("count")

    def test_rejects_non_integer_count(self) -> None:
        result = normalize_records([raw_row(count="2.5")])
        assert result.records == []
        assert result.invalid_rows[0].reason.startswith("count")

    def test_rejects_non_finite_counts(self) -> None:
        for bad in ("nan", "inf", "-inf"):
            result = normalize_records([raw_row(count=bad)])
            assert result.records == [], bad
            assert result.invalid_rows[0].reason.startswith("count"), bad

    def test_extra_overflow_columns_do_not_crash(self) -> None:
        row: dict = {**raw_row(), None: ["overflow", "fields"]}
        result = normalize_records([row])
        assert len(result.records) == 1
        assert result.invalid_rows == []

    def test_short_row_with_none_values_is_invalid_not_a_crash(self) -> None:
        row: dict = {**raw_row(), "count": None}
        result = normalize_records([row])
        assert result.records == []
        assert result.invalid_rows[0].reason.startswith("count")

    def test_invalid_rows_carry_row_number_for_traceability(self) -> None:
        result = normalize_records([raw_row(), raw_row(neighborhood="atlantis")])
        assert len(result.records) == 1
        assert result.invalid_rows[0].row_number == 2
