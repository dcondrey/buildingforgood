// @vitest-environment jsdom
/**
 * Card behaviour and accessibility (#16).
 *
 * The acceptance criterion is that every classification, forecast and
 * allocation has an ADJACENT explanation. These tests hold the component to
 * that rather than to merely rendering the text.
 */

import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { AiDisclosure, ResponsibleDataCard, SuppressionNotice } from "./ResponsibleDataCards.tsx";

afterEach(cleanup);

const POINTS = ["Counts are observations, not a census.", "Five months are missing entirely."];

describe("a card is adjacent, not behind a link", () => {
  it("shows its content without any interaction by default", () => {
    render(<ResponsibleDataCard title="Data" summary="Where this comes from" points={POINTS} />);
    for (const point of POINTS) expect(screen.getByText(point)).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("only hides content when explicitly asked to, and says so to assistive tech", async () => {
    const user = userEvent.setup();
    render(
      <ResponsibleDataCard
        title="Comparability"
        summary="Read before comparing across April 2017"
        points={POINTS}
        variant="disclosure"
      />,
    );
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(POINTS[0]!)).toBeNull();
    await user.keyboard("{Tab}{Enter}");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(POINTS[0]!)).toBeDefined();
  });

  it("keeps a caveat in the same block rather than behind another control", () => {
    render(
      <ResponsibleDataCard
        title="Allocation"
        summary="A split of the hours you entered"
        points={POINTS}
        caveat="Allocating every hour does not mean the need is covered."
      />,
    );
    expect(screen.getByText(/does not mean the need is covered/)).toBeDefined();
  });
});

describe("suppression reads as a data-quality state, never as zero", () => {
  it("says a withheld count is not zero", () => {
    render(<SuppressionNotice suppressedCells={534} suppressedRows={15} threshold={5} />);
    const note = screen.getByRole("note");
    expect(note.textContent).toMatch(/withheld count is not zero/i);
    expect(note.textContent).toContain("534");
    expect(note.textContent).toContain("15");
  });

  it("carries a symbol as well as words, so meaning survives greyscale", () => {
    render(<SuppressionNotice suppressedCells={534} suppressedRows={15} threshold={5} />);
    expect(screen.getByRole("note").textContent).toContain("◇");
  });
});

describe("the AI disclosure states the claim and any exception", () => {
  it("states that no generative model decides the three outputs", () => {
    render(<AiDisclosure />);
    expect(screen.getByText(/No generative model determines/i)).toBeDefined();
  });

  it("names anything a model did touch, so the claim stays true", () => {
    render(<AiDisclosure generativeUses={["Drafted card copy, reviewed by a person"]} />);
    expect(screen.getByText(/Drafted card copy, reviewed by a person/)).toBeDefined();
  });
});

describe("automated accessibility", () => {
  async function violations(el: HTMLElement) {
    const r = await axe.run(el, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return r.violations.map((v) => v.id);
  }

  it("has no violations across all three components", async () => {
    const { container } = render(
      <main>
        <h2>Data and limits</h2>
        <ResponsibleDataCard title="Data" summary="Where this comes from" points={POINTS} />
        <ResponsibleDataCard
          title="Model"
          summary="How the forecast works"
          points={POINTS}
          variant="disclosure"
        />
        <SuppressionNotice suppressedCells={534} suppressedRows={15} threshold={5} />
        <AiDisclosure generativeUses={["Drafted copy, reviewed by a person"]} />
      </main>,
    );
    expect(await violations(container)).toEqual([]);
  });
});
