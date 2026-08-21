"""Evidence-based drop testing (issue #8).

Deterministic classification of an apparent decline under the documented
rules in ``config/decision.v1.json``. Every threshold is provisional pending
the A-04 review (#35). While any force-insufficient condition holds (the
geography version is unresolved today), the classification is forced to
``insufficient_evidence`` — but every computable evidence component is still
published so the interface can show the case for and against the result. No
pseudo-probability confidence score is produced anywhere.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from stillhere_pipeline.aggregate import month_range

LIKELY_IMPROVEMENT = "likely_improvement"
POSSIBLE_DISPLACEMENT = "possible_displacement"
INSUFFICIENT_EVIDENCE = "insufficient_evidence"


@dataclass(frozen=True)
class DropTestConfig:
    """Thresholds from the decision contract's ``drop_test`` block."""

    comparison_window_periods: int
    minimum_sustained_periods: int
    minimum_recent_completeness_ratio: float
    possible_displacement_minimum_matched_share: float
    # Names of force-insufficient conditions that are active right now
    # (evaluated by the caller against the contract's status fields).
    active_forced_conditions: tuple[str, ...] = ()


@dataclass(frozen=True)
class EvidenceComponent:
    """One inspectable reason for or against the classification."""

    id: str
    direction: str  # "for" | "against" | "uncertainty"
    statement: str
    value: float | None = None


@dataclass(frozen=True)
class DropEvidence:
    area: str
    period: str
    window_months: list[str]
    classification: str
    components: list[EvidenceComponent] = field(default_factory=list)
    forced_reasons: list[str] = field(default_factory=list)


def _window(period: str, periods: int) -> list[str]:
    """The ``periods`` + 1 calendar months ending at ``period`` inclusive.

    The window spans the comparison distance: with a 3-period window ending
    2022-12, the anchor month is 2022-09 and the apparent change is
    total(2022-12) - total(2022-09).
    """
    year, month = int(period[:4]), int(period[5:7])
    month -= periods
    while month < 1:
        month += 12
        year -= 1
    return month_range(f"{year:04d}-{month:02d}", period)


def evaluate_drop(
    area: str,
    period: str,
    totals: dict[str, int],
    config: DropTestConfig,
    method_break_months: dict[str, str],
    adjacency_available: bool = False,
    adjacent_matched_share: float | None = None,
) -> DropEvidence:
    """Classify the apparent change ending at ``period`` for one area.

    ``totals`` maps observed month -> published aggregate total; suppressed or
    missing months are simply absent. ``method_break_months`` maps month ->
    comparability-event id for events that affect interpretation.
    """
    window = _window(period, config.comparison_window_periods)
    observed = [m for m in window if m in totals]
    completeness = len(observed) / len(window)
    components: list[EvidenceComponent] = []

    complete_enough = completeness >= config.minimum_recent_completeness_ratio
    components.append(
        EvidenceComponent(
            id="window_completeness",
            direction="for" if complete_enough else "against",
            statement=(
                f"{len(observed)} of {len(window)} months in the comparison window "
                f"are published ({completeness:.0%}; minimum "
                f"{config.minimum_recent_completeness_ratio:.0%})."
            ),
            value=round(completeness, 4),
        )
    )

    anchor = window[0]
    apparent_change: float | None = None
    if anchor in totals and period in totals:
        apparent_change = float(totals[period] - totals[anchor])
        direction = "for" if apparent_change < 0 else "against"
        components.append(
            EvidenceComponent(
                id="apparent_change",
                direction=direction,
                statement=(
                    f"The aggregate observation moved from {totals[anchor]} ({anchor}) "
                    f"to {totals[period]} ({period}), a change of {apparent_change:+.0f}."
                ),
                value=apparent_change,
            )
        )
    else:
        components.append(
            EvidenceComponent(
                id="apparent_change",
                direction="uncertainty",
                statement=(
                    f"The change from {anchor} to {period} cannot be computed because at "
                    "least one endpoint month is unpublished."
                ),
            )
        )

    # Sustained decline: the most recent consecutive observed month-over-month
    # deltas, ending at the selected period, must be non-increasing for at
    # least minimum_sustained_periods steps.
    sustained_steps = 0
    if period in totals:
        for earlier, later in zip(reversed(window[:-1]), reversed(window[1:]), strict=True):
            if earlier not in totals or later not in totals:
                break
            if totals[later] - totals[earlier] > 0:
                break
            sustained_steps += 1
    sustained = sustained_steps >= config.minimum_sustained_periods and (
        apparent_change is not None and apparent_change < 0
    )
    components.append(
        EvidenceComponent(
            id="sustained_change",
            direction="for" if sustained else "against",
            statement=(
                f"The decline is sustained across {sustained_steps} consecutive observed "
                f"month steps ending {period} (minimum {config.minimum_sustained_periods})."
                if sustained
                else (
                    f"Only {sustained_steps} consecutive non-increasing observed month steps "
                    f"end at {period} (minimum {config.minimum_sustained_periods}); the "
                    "change does not qualify as sustained."
                )
            ),
            value=float(sustained_steps),
        )
    )

    breaks_in_window = sorted(
        {event_id for month, event_id in method_break_months.items() if month in window}
    )
    if breaks_in_window:
        components.append(
            EvidenceComponent(
                id="method_break",
                direction="against",
                statement=(
                    "The comparison window crosses documented comparability events: "
                    + ", ".join(breaks_in_window)
                    + ". Periods on either side may not be directly comparable."
                ),
            )
        )
    else:
        components.append(
            EvidenceComponent(
                id="method_break",
                direction="for",
                statement="No documented methodology or boundary change falls inside the window.",
            )
        )

    if adjacency_available and adjacent_matched_share is not None:
        matched = adjacent_matched_share >= config.possible_displacement_minimum_matched_share
        components.append(
            EvidenceComponent(
                id="adjacent_matched_share",
                direction="for" if matched else "against",
                statement=(
                    f"{adjacent_matched_share:.0%} of the local decline is matched by "
                    f"adjacent aggregate increases (displacement threshold "
                    f"{config.possible_displacement_minimum_matched_share:.0%})."
                ),
                value=round(adjacent_matched_share, 4),
            )
        )
    else:
        components.append(
            EvidenceComponent(
                id="adjacent_evidence",
                direction="uncertainty",
                statement=(
                    "Adjacent-area evidence is unavailable: no versioned adjacency "
                    "definition exists yet, so displacement can be neither supported "
                    "nor ruled out."
                ),
            )
        )

    classification = _classify(
        config=config,
        sustained=sustained,
        complete_enough=complete_enough,
        has_break=bool(breaks_in_window),
        adjacency_available=adjacency_available,
        adjacent_matched_share=adjacent_matched_share,
    )

    return DropEvidence(
        area=area,
        period=period,
        window_months=window,
        classification=classification,
        components=components,
        forced_reasons=list(config.active_forced_conditions),
    )


def _classify(
    config: DropTestConfig,
    sustained: bool,
    complete_enough: bool,
    has_break: bool,
    adjacency_available: bool,
    adjacent_matched_share: float | None,
) -> str:
    if config.active_forced_conditions:
        return INSUFFICIENT_EVIDENCE
    if not sustained or not complete_enough or has_break:
        return INSUFFICIENT_EVIDENCE
    if not adjacency_available or adjacent_matched_share is None:
        # A sustained, comparable decline without adjacency evidence cannot
        # rule displacement in or out.
        return INSUFFICIENT_EVIDENCE
    if adjacent_matched_share >= config.possible_displacement_minimum_matched_share:
        return POSSIBLE_DISPLACEMENT
    return LIKELY_IMPROVEMENT
