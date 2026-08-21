import { useEffect, useState } from "react";
import "./App.css";
import { parsePreparedScenario, type PreparedScenario } from "./lib/scenario";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; scenario: PreparedScenario }
  | { kind: "error"; message: string };

const STEPS = [
  {
    title: "Test the drop",
    description: "Did conditions improve, did need shift, or is there not enough evidence to know?",
    milestone: "M2",
  },
  {
    title: "Forecast",
    description: "Aggregate neighborhood observations with uncertainty, never individual behavior.",
    milestone: "M2",
  },
  {
    title: "Plan next shift",
    description: "Fairness-constrained outreach hours with human review, locks, and overrides.",
    milestone: "M4",
  },
];

function App() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/generated/prepared_scenario.v0.json")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`fetch failed with status ${response.status}`);
        }
        return parsePreparedScenario(await response.json());
      })
      .then((scenario) => {
        if (!cancelled) setState({ kind: "ready", scenario });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="shell">
      <header>
        <h1>Still Here SD</h1>
        <p className="tagline">See beyond the count. Plan the next shift.</p>
      </header>

      <section aria-labelledby="scenario-heading" className="panel">
        <h2 id="scenario-heading">Prepared scenario</h2>
        {state.kind === "loading" && <p>Loading scenario…</p>}
        {state.kind === "error" && (
          <p role="alert" className="error">
            Could not load the prepared scenario: {state.message}
          </p>
        )}
        {state.kind === "ready" && (
          <dl className="scenario">
            <div>
              <dt>Name</dt>
              <dd>{state.scenario.scenario.name}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`badge badge-${state.scenario.status}`}>
                  {state.scenario.status}
                </span>
              </dd>
            </div>
            <div>
              <dt>Decision owner</dt>
              <dd>{state.scenario.scenario.decision_owner}</dd>
            </div>
            <div>
              <dt>Planning horizon</dt>
              <dd>{state.scenario.scenario.planning_horizon}</dd>
            </div>
            <div>
              <dt>Observation grain</dt>
              <dd>{state.scenario.scenario.observation_grain}</dd>
            </div>
            <div>
              <dt>Available hours</dt>
              <dd>{state.scenario.scenario.available_hours ?? "not set"}</dd>
            </div>
          </dl>
        )}
        {state.kind === "ready" && state.scenario.note && (
          <p className="note">{state.scenario.note}</p>
        )}
      </section>

      <section aria-labelledby="steps-heading" className="panel">
        <h2 id="steps-heading">One connected decision pipeline</h2>
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <p className="milestone">Arrives in {step.milestone}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer>
        <p>Aggregate places, never profile people.</p>
      </footer>
    </main>
  );
}

export default App;
