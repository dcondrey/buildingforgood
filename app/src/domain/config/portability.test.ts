/**
 * Portability is demonstrated on two San Diego area definitions and nowhere else.
 *
 * The shape is `UNSHIPPED_CONNECTORS`'s, in
 * `app/src/domain/vocabulary/refusedTerms.ts`: a declaration of coverage this
 * project does NOT have, written down because the file that looks like the
 * only thing needing attention is not, with a test that fails when the
 * repository quietly claims otherwise.
 *
 * Why it was needed. The evidence that this tool ports to another
 * organization's geography came from running a profile for an organization
 * that does not exist. It showed that the loader accepts a well-formed file.
 * That is void; `docs/project/DECISIONS.md`, 2026-08-23. What is left is two
 * profiles, both Downtown San Diego, both citing the same pinned report — a
 * real result, and a much narrower one than the sentence it replaced.
 *
 * `config/portability-demonstrated.v1.json` holds the declaration. This file
 * checks it four ways: every shipped profile is declared, every declared
 * profile still resolves to the published source named for it, the claim
 * appears word for word on every surface it names, and no scanned surface
 * carries a phrase stating a portability nobody here has shown.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import declaration from "../../../../config/portability-demonstrated.v1.json" with { type: "json" };

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PROFILE_DIR = join(REPO_ROOT, "config/profiles");

const SCANNED_EXTENSIONS = [".md", ".ts", ".tsx", ".json", ".yaml", ".yml"];
const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist", "coverage", ".git", ".venv"]);

/** The declaration and this file both name the phrases; neither is an overclaim. */
const SELF = new Set([
  "config/portability-demonstrated.v1.json",
  "app/src/domain/config/portability.test.ts",
]);

interface ProfileFile {
  path: string;
  profile_id: string;
  areaListVersion: string;
  provenance: Record<string, unknown>;
}

const SHIPPED: ProfileFile[] = readdirSync(PROFILE_DIR)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => {
    const document = JSON.parse(readFileSync(join(PROFILE_DIR, name), "utf8")) as {
      profile_id: string;
      geography: { area_list: { version: string; provenance: Record<string, unknown> } };
    };
    return {
      path: `config/profiles/${name}`,
      profile_id: document.profile_id,
      areaListVersion: document.geography.area_list.version,
      provenance: document.geography.area_list.provenance,
    };
  });

function walk(absolute: string, out: string[]): void {
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      walk(join(absolute, entry.name), out);
      continue;
    }
    if (SCANNED_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      out.push(join(absolute, entry.name));
    }
  }
}

function scannedFiles(): string[] {
  const files: string[] = [];
  for (const surface of declaration.forbidden_claims.scanned_surfaces) {
    const absolute = join(REPO_ROOT, surface);
    if (statSync(absolute).isDirectory()) walk(absolute, files);
    else files.push(absolute);
  }
  return files.filter((file) => !SELF.has(relative(REPO_ROOT, file)));
}

describe("the portability declaration matches what ships", () => {
  it("declares every profile in config/profiles, so a third cannot arrive undeclared", () => {
    const declared = declaration.demonstrated_on.map((entry) => entry.profile_id).sort();
    expect(SHIPPED.map((profile) => profile.profile_id).sort()).toEqual(declared);
    expect(declaration.demonstrated_on.map((entry) => entry.path).sort()).toEqual(
      SHIPPED.map((profile) => profile.path).sort(),
    );
  });

  it("holds each declared profile to the published source it names", () => {
    for (const entry of declaration.demonstrated_on) {
      const profile = SHIPPED.find((candidate) => candidate.profile_id === entry.profile_id);
      expect(profile, entry.profile_id).toBeDefined();
      expect(profile?.areaListVersion, entry.profile_id).toBe(entry.area_list_version);
      expect(profile?.provenance.resolution_status, entry.profile_id).toBe("resolved");
      for (const [field, value] of Object.entries(entry.area_list_source)) {
        expect(profile?.provenance[field], `${entry.profile_id}: ${field}`).toBe(value);
      }
    }
  });

  it("names what it does not demonstrate, in sentences a reader can act on", () => {
    const gaps = Object.entries(declaration.not_demonstrated);
    expect(gaps.length).toBeGreaterThan(0);
    for (const [gap, explanation] of gaps) {
      expect(explanation.length, gap).toBeGreaterThan(80);
    }
  });
});

describe("no surface claims a portability nobody has demonstrated", () => {
  it("carries the claim word for word on every surface it names", () => {
    expect(declaration.claim_surfaces.length).toBeGreaterThan(0);
    for (const surface of declaration.claim_surfaces) {
      const text = readFileSync(join(REPO_ROOT, surface), "utf8").replace(/\s+/g, " ");
      expect(text, surface).toContain(declaration.claim.replace(/\s+/g, " "));
    }
  });

  it("finds no forbidden phrase in any scanned surface", () => {
    const permitted = declaration.forbidden_claims.permitted_contexts as Array<{
      path: string;
      line_contains: string;
    }>;
    const hits: string[] = [];
    for (const file of scannedFiles()) {
      const path = relative(REPO_ROOT, file);
      const lines = readFileSync(file, "utf8").split("\n");
      for (const [index, line] of lines.entries()) {
        const lowered = line.toLowerCase();
        for (const phrase of declaration.forbidden_claims.phrases) {
          if (!lowered.includes(phrase.toLowerCase())) continue;
          const registered = permitted.some(
            (context) => context.path === path && line.includes(context.line_contains),
          );
          if (!registered) hits.push(`${path}:${index + 1} "${phrase}" — ${line.trim()}`);
        }
      }
    }
    expect(hits, "register the line in permitted_contexts, or withdraw the claim").toEqual([]);
  });
});
