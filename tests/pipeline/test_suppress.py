"""Small-cell suppression (R-06, PR #44 integration).

The invariant under test: no published artifact may carry an integer
0 < v < SMALL_CELL_THRESHOLD in an observation cell, and no suppressed value
may be exactly recoverable by arithmetic from the published values in its row.
"""

from stillhere_pipeline.suppress import SMALL_CELL_THRESHOLD, suppress_observation_row


def row(total: int, individual: int = 0, structure: int = 0, vehicle: int = 0) -> dict:
    return {
        "month": "2021-09",
        "total": total,
        "by_type": {"individual": individual, "structure": structure, "vehicle": vehicle},
    }


class TestWholeRowSuppression:
    def test_small_total_suppresses_whole_row(self) -> None:
        result = suppress_observation_row(row(3, individual=3))
        assert result == {"month": "2021-09", "total": None, "suppressed": True}

    def test_by_type_is_omitted_on_suppressed_rows(self) -> None:
        assert "by_type" not in suppress_observation_row(row(4, individual=2, structure=2))

    def test_zero_total_row_is_published_untouched(self) -> None:
        result = suppress_observation_row(row(0))
        assert result["total"] == 0
        assert result["by_type"] == {"individual": 0, "structure": 0, "vehicle": 0}


class TestCellSuppression:
    def test_large_values_pass_through(self) -> None:
        result = suppress_observation_row(row(44, individual=30, structure=9, vehicle=5))
        assert result["total"] == 44
        assert result["by_type"] == {"individual": 30, "structure": 9, "vehicle": 5}
        assert "by_type_suppressed" not in result

    def test_two_small_cells_suppress_to_null(self) -> None:
        result = suppress_observation_row(row(36, individual=30, structure=3, vehicle=3))
        assert result["total"] == 36
        assert result["by_type"] == {"individual": 30, "structure": None, "vehicle": None}
        assert result["by_type_suppressed"] == ["structure", "vehicle"]

    def test_single_small_cell_takes_a_complementary_partner(self) -> None:
        # vehicle=3 alone would be recoverable as total minus the published
        # types; the next-smallest nonzero type joins it.
        result = suppress_observation_row(row(45, individual=30, structure=12, vehicle=3))
        assert result["total"] == 45
        assert result["by_type"] == {"individual": 30, "structure": None, "vehicle": None}
        assert result["by_type_suppressed"] == ["structure", "vehicle"]

    def test_zeros_are_published_not_suppressed(self) -> None:
        # individual=40, vehicle=2: the only complementary candidate is a
        # zero, which is publishable; zero cells never join the suppression,
        # so the remaining partner is the other nonzero cell.
        result = suppress_observation_row(row(42, individual=40, structure=0, vehicle=2))
        assert result["by_type"]["structure"] == 0
        assert result["by_type"] == {"individual": None, "structure": 0, "vehicle": None}
        assert result["by_type_suppressed"] == ["individual", "vehicle"]


class TestNonRecoverability:
    def test_no_row_leaves_exactly_one_suppressed_nonzero_cell(self) -> None:
        # Property over a broad sweep: after suppression, a published row
        # never lets subtraction recover a suppressed cell exactly.
        for individual in range(0, 12):
            for structure in range(0, 12):
                for vehicle in range(0, 12):
                    total = individual + structure + vehicle
                    result = suppress_observation_row(row(total, individual, structure, vehicle))
                    if result.get("suppressed"):
                        continue
                    by_type = result["by_type"]
                    nulls = [k for k, v in by_type.items() if v is None]
                    published = [v for v in by_type.values() if isinstance(v, int)]
                    # invariant 1: no published small cell
                    assert all(v == 0 or v >= SMALL_CELL_THRESHOLD for v in published), by_type
                    if result["total"] is not None and nulls:
                        # invariant 2: at least two suppressed cells, so the
                        # remainder never pins a single cell
                        assert len(nulls) >= 2, (individual, structure, vehicle, by_type)

    def test_total_minus_published_equals_suppressed_mass(self) -> None:
        # vehicle=4 is small; individual=40 joins as its complementary
        # partner; structure=0 stays published. The published remainder must
        # equal the combined suppressed mass, never a single cell.
        result = suppress_observation_row(row(44, individual=40, structure=0, vehicle=4))
        published_sum = sum(v for v in result["by_type"].values() if isinstance(v, int))
        assert result["total"] - published_sum == 40 + 4


class TestDeterminism:
    def test_suppression_is_pure_and_deterministic(self) -> None:
        first = suppress_observation_row(row(45, individual=30, structure=12, vehicle=3))
        second = suppress_observation_row(row(45, individual=30, structure=12, vehicle=3))
        assert first == second

    def test_input_row_is_not_mutated(self) -> None:
        original = row(45, individual=30, structure=12, vehicle=3)
        snapshot = {**original, "by_type": dict(original["by_type"])}
        suppress_observation_row(original)
        assert original == snapshot
