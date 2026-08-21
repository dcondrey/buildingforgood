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


def attacker_assignments(k: int, remainder: int) -> list[tuple[int, ...]]:
    """Independent oracle: every assignment an attacker must consider.

    Deliberately re-derived here rather than imported, so the test is an
    independent check on the production logic, not a mirror of it. The public
    policy admits two stories for k suppressed cells summing to `remainder`:
    all cells small (1..4 each), or, only when k == 2, one small cell plus a
    complementary partner that must be >= 5.
    """
    from itertools import product as iproduct

    assignments = []
    if k >= 2:
        assignments += [c for c in iproduct(range(1, 5), repeat=k) if sum(c) == remainder]
    if k == 2:
        for small in range(1, 5):
            partner = remainder - small
            if partner >= 5:
                assignments += [(small, partner), (partner, small)]
    return assignments


class TestNonRecoverability:
    def test_reviewer_found_leak_is_closed(self) -> None:
        # cortez 2018-02 in the real artifact: {52, ind 50, str 1, veh 1}.
        # Remainder 2 across two suppressed cells pins both at exactly 1;
        # the row must escalate to whole-row suppression.
        result = suppress_observation_row(row(52, individual=50, structure=1, vehicle=1))
        assert result == {"month": "2021-09", "total": None, "suppressed": True}

    def test_unique_multiset_also_escalates(self) -> None:
        # Remainder 3 forces the multiset {1, 2}: the attacker learns every
        # suppressed value, only not which type holds which. Escalate.
        result = suppress_observation_row(row(33, individual=30, structure=1, vehicle=2))
        assert result.get("suppressed") is True

    def test_ambiguous_remainder_stays_published(self) -> None:
        # Remainder 6 admits {2,4}, {3,3}, and {1,5}: nothing is pinned.
        result = suppress_observation_row(row(36, individual=30, structure=3, vehicle=3))
        assert result["total"] == 36
        assert result["by_type_suppressed"] == ["structure", "vehicle"]

    def test_property_sweep_against_independent_attacker(self) -> None:
        # Exhaustive sweep: for every published row, the independent attacker
        # oracle must not pin any suppressed cell to a single value, and no
        # published cell may be a small int.
        for individual in range(0, 12):
            for structure in range(0, 12):
                for vehicle in range(0, 12):
                    total = individual + structure + vehicle
                    result = suppress_observation_row(row(total, individual, structure, vehicle))
                    if result.get("suppressed"):
                        continue
                    by_type = result["by_type"]
                    published = [v for v in by_type.values() if isinstance(v, int)]
                    assert all(v == 0 or v >= SMALL_CELL_THRESHOLD for v in published), by_type
                    nulls = [k for k, v in by_type.items() if v is None]
                    if not nulls:
                        continue
                    remainder = result["total"] - sum(published)
                    assignments = attacker_assignments(len(nulls), remainder)
                    assert assignments, (individual, structure, vehicle)
                    for position in range(len(nulls)):
                        feasible = {a[position] for a in assignments}
                        assert len(feasible) > 1, (individual, structure, vehicle, assignments)
                    multisets = {tuple(sorted(a)) for a in assignments}
                    assert len(multisets) > 1, (individual, structure, vehicle, multisets)

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
