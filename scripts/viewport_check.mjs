#!/usr/bin/env node
/**
 * Render the built site in a real browser and hold it to two properties that
 * only layout can settle.
 *
 * Every other gate in this repository reads source. That is why five defects
 * survived every one of them:
 *
 *   * `.map-edge` reached the eye at 4.80px on a 320px phone. Its declared size
 *     is 3.5, which is not pixels — it is user units inside a 160-unit viewBox,
 *     and what a reader sees is that number times a scale nothing had measured.
 *   * `.chart-axis` rendered at 7.96px at *every* width, 4K included.
 *   * The page scrolled sideways at 320px, a 1.4.10 failure, because two chips
 *     were declared in the reflow allowlist as "a one-word chip" while actually
 *     rendering 47 characters and 339px. Nothing checked the justification.
 *   * Four of the six stylesheets were not read by any static guard at all.
 *   * Two regions scrolled horizontally with no way for a keyboard to reach
 *     them.
 *
 * The recurring defect in this repository is not code that fails. It is checks
 * that pass without earning it. A source-reading gate cannot earn either of
 * these two, so this one opens a browser.
 *
 *     node scripts/viewport_check.mjs
 *
 * It serves `app/dist`, so build first; `verify.sh` does that in the stage
 * before this one. It needs Chromium — if that is missing it fails and says how
 * to install it, rather than skipping, because a skipped gate reports the same
 * green as a passing one and that is the thing being defended against.
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../app/dist/", import.meta.url));

/**
 * The floor, in CSS pixels, for anything a reader is meant to read.
 *
 * 11 is not a WCAG number — no success criterion sets a minimum size. It is the
 * platform floor: iOS asks for 11pt, and below roughly this a mono digit stops
 * being reliably distinguishable for a reader who is not young. The type ladder
 * therefore stops here instead of continuing down, and its bottom rung is this
 * value exactly.
 */
const FLOOR_PX = 11;

/**
 * Deliberately not rendered, as opposed to rendered too small. `font-size: 0`
 * is unambiguous — nobody arrives at it by nudging — and the text stays in the
 * accessibility tree, which is the point of it: the step nav shows numbers on a
 * narrow screen and still announces the destination.
 */
const HIDDEN = 0;

/** Width, height, device pixel ratio. The shapes a reader actually turns up on. */
const VIEWPORTS = [
  ["phone-small", 320, 568, 2],
  ["phone-se", 375, 667, 2],
  ["phone-14pro", 393, 852, 3],
  ["phone-pixel7", 412, 915, 2.6],
  ["tablet-portrait", 768, 1024, 2],
  ["tablet-landscape", 1024, 768, 2],
  ["laptop", 1280, 800, 1],
  ["desktop", 1440, 900, 2],
  ["widescreen", 1920, 1080, 1],
  ["ultrawide", 2560, 1080, 1],
  ["tallscreen", 1080, 1920, 1],
  ["4k", 3840, 2160, 2],
];

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function serve() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    for (const candidate of [join(ROOT, path), join(ROOT, path, "index.html"), join(ROOT, "index.html")]) {
      try {
        const body = await readFile(candidate);
        res.writeHead(200, { "content-type": TYPES[extname(candidate)] ?? "application/octet-stream" });
        return res.end(body);
      } catch {
        /* try the next candidate */
      }
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

/**
 * Runs inside the page.
 *
 * The rendered size of SVG text is not its computed font-size. That value is in
 * user units, which the viewBox transform then scales, so the number a reader
 * sees is the computed size times the element's screen CTM. Reading
 * `font-size` alone is what let a 3.5 sit in the sheet looking deliberate while
 * arriving at 4.8px.
 */
const INSPECT = ({ viewportWidth, floor }) => {
  const small = [];
  const wide = [];

  for (const el of document.querySelectorAll("*")) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;

    const own = [...el.childNodes]
      .filter((node) => node.nodeType === 3 && node.textContent.trim())
      .map((node) => node.textContent.trim())
      .join(" ");
    if (own) {
      let scale = 1;
      if (el.ownerSVGElement) {
        const ctm = el.getScreenCTM?.();
        if (ctm) scale = Math.sqrt(Math.abs(ctm.a * ctm.d - ctm.b * ctm.c)) || 1;
      }
      const rendered = parseFloat(style.fontSize) * scale;
      if (rendered > 0 && rendered < floor) {
        small.push({
          rendered: +rendered.toFixed(2),
          declared: style.fontSize,
          tag: el.tagName.toLowerCase(),
          cls: el.getAttribute("class") || "",
          text: own.slice(0, 40),
        });
      }
    }

    // Overflow inside something that scrolls on purpose is not overflow.
    if (box.right > viewportWidth + 1 || box.left < -1) {
      let scrollable = false;
      for (let up = el.parentElement; up; up = up.parentElement) {
        const overflow = getComputedStyle(up).overflowX;
        if (overflow === "auto" || overflow === "scroll") {
          scrollable = true;
          break;
        }
      }
      if (!scrollable) {
        wide.push({
          tag: el.tagName.toLowerCase(),
          cls: el.getAttribute("class") || "",
          left: Math.round(box.left),
          right: Math.round(box.right),
          text: (el.textContent || "").trim().slice(0, 40),
        });
      }
    }
  }

  const dedupe = (rows) => {
    const seen = new Map();
    for (const row of rows) if (!seen.has(row.tag + row.cls)) seen.set(row.tag + row.cls, row);
    return [...seen.values()];
  };
  return {
    small: dedupe(small),
    wide: dedupe(wide),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
};

async function main() {
  let chromium;
  try {
    // Resolved against app/, where the dependency lives; a bare specifier would
    // be looked up from scripts/ and never found.
    const from = createRequire(new URL("../app/package.json", import.meta.url));
    const mod = await import(pathToFileURL(from.resolve("playwright")).href);
    // playwright's entry is CommonJS, so depending on how the interop resolves
    // the launcher arrives either as a named export or under default.
    chromium = mod.chromium ?? mod.default?.chromium;
    if (!chromium) throw new Error("playwright exported no chromium launcher");
  } catch {
    console.error("VIEWPORT CHECK ABORTED. playwright is not installed.");
    console.error("  npm --prefix app ci");
    return 1;
  }

  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;

  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    server.close();
    console.error("VIEWPORT CHECK ABORTED. Chromium is not installed.");
    console.error("  npx --prefix app playwright install chromium");
    console.error(`\n  ${error.message.split("\n")[0]}`);
    return 1;
  }

  const failures = [];
  for (const [name, width, height, ratio] of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: ratio,
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const found = await page.evaluate(INSPECT, { viewportWidth: width, floor: FLOOR_PX });
    await context.close();

    const scrolls = found.scrollWidth > found.clientWidth + 1;
    const ok = found.small.length === 0 && found.wide.length === 0 && !scrolls;
    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${name.padEnd(17)} ${String(width).padStart(4)}x${String(height).padEnd(4)} ` +
        `@${ratio}x  ${found.small.length} under ${FLOOR_PX}px, ${found.wide.length} past the right edge`,
    );
    for (const row of found.small) {
      failures.push(
        `${name}: <${row.tag}> .${row.cls || "—"} renders at ${row.rendered}px ` +
          `(declared ${row.declared}) — ${JSON.stringify(row.text)}`,
      );
    }
    for (const row of found.wide) {
      failures.push(
        `${name}: <${row.tag}> .${row.cls || "—"} spans ${row.left}..${row.right} ` +
          `past a ${width}px viewport — ${JSON.stringify(row.text)}`,
      );
    }
    if (scrolls) {
      failures.push(`${name}: the page scrolls sideways (${found.scrollWidth} > ${found.clientWidth})`);
    }
  }

  await browser.close();
  server.close();

  console.log();
  if (failures.length) {
    console.error("VIEWPORT CHECK FAILED\n");
    for (const failure of failures) console.error(`  ${failure}`);
    console.error(
      `\n${failures.length} findings. Text below ${FLOOR_PX}px is text somebody cannot read, and a page` +
        "\nthat scrolls sideways at 320px fails WCAG 1.4.10. For SVG text remember the" +
        "\ndeclared size is in user units: what a reader sees is that times the viewBox scale.",
    );
    return 1;
  }
  console.log(
    `VIEWPORT CHECK PASSED — ${VIEWPORTS.length} viewports, nothing under ${FLOOR_PX}px, nothing past the right edge.`,
  );
  console.log(`Deliberate hiding at font-size ${HIDDEN} is allowed and is not what this looks for.`);
  return 0;
}

process.exit(await main());
