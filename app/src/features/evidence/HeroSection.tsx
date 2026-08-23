import { EvidenceChain } from "../../features/evidence/EvidenceChain";
import { PlanState } from "../../features/planner/PlannerPieces";
import { useShell } from "../../features/shell/ShellContext";
import { formatNumber } from "../../lib/format";

export function HeroSection() {
  const { budget, data, individualOne, loading, plan, signal } = useShell();
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="status-line">
            <i className="status-dot" />{" "}
            {loading
              ? "Verifying local artifacts…"
              : data.origin === "generated"
                ? "Generated analysis loaded"
                : "Offline demo snapshot"}
          </span>
          <p className="kicker">
            Prepared decision · {data.scenario.focusArea} · {data.scenario.period}
          </p>
          <h1 id="hero-title">
            Fewer tents,
            <br />
            <em>or fewer people?</em>
          </h1>
          <p className="hero-lede">
            Downtown San Diego’s component-derived unsheltered estimate fell 22% in a year on the
            fixed 261-block panel, but the drop came from tents, not people: direct observations of
            people rose and appeared on 25 more blocks than the year before. This tool shows what
            changed, what’s uncertain, and where the next outreach shift should go.
          </p>
          <div
            className="composition-lead"
            aria-label="Observed composition and active-block footprint comparison"
            role="group"
          >
            <div>
              <span>People seen in the field</span>
              <strong>+{formatNumber(signal.components.individuals.changePct, 1)}%</strong>
              <small>
                {signal.components.individuals.from} → {signal.components.individuals.to}
              </small>
            </div>
            <div>
              <span>Tents & structures</span>
              <strong>{formatNumber(signal.components.structures.changePct, 1)}%</strong>
              <small>
                {signal.components.structures.from} → {signal.components.structures.to}
              </small>
            </div>
            <div>
              <span>Vehicles</span>
              <strong>{formatNumber(signal.components.vehicles.changePct, 1)}%</strong>
              <small>
                {signal.components.vehicles.from} → {signal.components.vehicles.to}
              </small>
            </div>
            <div>
              <span>{individualOne ? "Blocks where people were seen" : "Active blocks"}</span>
              <strong>
                +
                {individualOne
                  ? formatNumber((individualOne.change / individualOne.fromBlocks) * 100, 1)
                  : formatNumber(signal.activeChangePct, 1)}
                %
              </strong>
              <small>
                {individualOne?.fromBlocks ?? signal.activeFrom} →{" "}
                {individualOne?.toBlocks ?? signal.activeTo}
              </small>
            </div>
            <p>Same month · same method · same {signal.panelSize} blocks</p>
          </div>
        </div>
        <div aria-label="Prepared scenario summary" className="hero-decision" role="group">
          <span className="eyebrow">The decision at hand</span>
          <p>
            Suppose <strong>{budget} staff-hours</strong> are available for next week’s outreach
            shifts. Which neighborhoods should get them?
          </p>
          <p className="capacity-note">
            The hours are an editable assumption, not staffing data. A real deployment would use the
            provider’s own schedule.
          </p>
          <div className="provisional-note">
            <span>{data.scenario.status === "ready" ? "✓ Prepared" : "◇ Provisional"}</span>{" "}
            Evidence limits and review triggers travel with the result.
          </div>
          <EvidenceChain data={data} />
        </div>
      </section>

      <nav aria-label="Decision steps" className="step-nav">
        <a href="#drop-test">
          <span>01</span> Test the drop
        </a>
        <a href="#forecast">
          <span>02</span> Check the forecast
        </a>
        <a href="#planner">
          <span>03</span> Plan the shift
        </a>
        <a href="#review">
          <span>04</span> Human review
        </a>
        {plan?.feasible && <PlanState />}
      </nav>
    </>
  );
}
