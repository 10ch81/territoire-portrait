import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  ESS_RGE_OPPORTUNITY_PATTERN,
  buildFinalTerritorialAnalysis,
} from "./evaluation-helpers";
import { bousseLikeProfile } from "./contextual-reference-profiles";
import {
  chamonixProfile,
  palaiseauProfile,
  rennesProfile,
} from "./reference-communes";
import type { EditorialAnalysisOutput, TerritoryAnalysis, TerritoryProfile } from "../types";
import { findEditorialPolishViolations } from "./editorial/editorialPolish";

const MECHANICAL_PRUDENCE_SUFFIX = / — Interprétation prudente/i;
const ESS_RGE_LEVER_PATTERN = /\b(?:ESS|RGE)\b/i;
const FRANCE_SERVICES_PATTERN = /France Services/i;
const DENSITY_IN_SUMMARY_PATTERN = /densité d'environ/i;

/** Empreinte stable de la couche éditoriale v2 (hors watchPoints MVP). */
function editorialV2SnapshotHash(profile: TerritoryProfile): string {
  const { analysis } = buildFinalTerritorialAnalysis(profile);
  const editorial = analysis.editorial;
  assert.ok(editorial, "couche editorial attendue");
  const payload = JSON.stringify({
    profileId: editorial.profileId,
    summary: editorial.summary,
    strengths: editorial.strengths,
    opportunities: editorial.opportunities,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/** Golden hashes — régénérer via `npx tsx scripts/gen-editorial-v2-snapshot-hashes.ts`. */
const EDITORIAL_V2_SNAPSHOT_HASHES: Record<string, string> = {
  rennes: "1111b105de7c166c",
  palaiseau: "2ee142b15d5ca514",
  chamonix: "6ab265418df46e83",
  bousse: "d1c2e61c98f8b27a",
};

function requireEditorial(analysis: TerritoryAnalysis): EditorialAnalysisOutput {
  assert.ok(analysis.editorial, "couche editorial attendue");
  return analysis.editorial;
}

function collectEditorialText(editorial: EditorialAnalysisOutput): string {
  return [
    editorial.summary,
    ...editorial.strengths,
    ...editorial.opportunities,
  ].join("\n");
}

function countOccurrences(text: string, needle: string): number {
  const normalized = text.toLowerCase();
  const target = needle.toLowerCase();
  let count = 0;
  let index = normalized.indexOf(target);
  while (index >= 0) {
    count += 1;
    index = normalized.indexOf(target, index + target.length);
  }
  return count;
}

function assertNoRedundantTypologyParentheses(summary: string): void {
  for (const match of summary.matchAll(/\(([^)]+)\)/g)) {
    const inner = match[1]?.trim() ?? "";
    if (inner.length === 0) continue;
    assert.ok(
      !summary.slice(0, match.index).toLowerCase().includes(inner.toLowerCase()),
      `parenthèse redondante: (${inner})`,
    );
  }
}

function assertGlobalEditorialPolish(editorial: EditorialAnalysisOutput): void {
  const text = collectEditorialText(editorial);
  assert.doesNotMatch(text, /\bportent à\b/i);
  assert.doesNotMatch(text, /\)\.,/);
  assert.doesNotMatch(text, /\.\./);
  assert.doesNotMatch(text, MECHANICAL_PRUDENCE_SUFFIX);
  assert.doesNotMatch(editorial.summary, DENSITY_IN_SUMMARY_PATTERN);
  assert.equal(findEditorialPolishViolations(editorial).length, 0);
  assertNoRedundantTypologyParentheses(editorial.summary);
}

describe("editorial v2 snapshots — références figées", () => {
  const profiles: Array<[string, TerritoryProfile]> = [
    ["rennes", rennesProfile],
    ["palaiseau", palaiseauProfile],
    ["chamonix", chamonixProfile],
    ["bousse", bousseLikeProfile],
  ];

  for (const [name, profile] of profiles) {
    it(`${name} — hash v2 stable`, () => {
      assert.equal(editorialV2SnapshotHash(profile), EDITORIAL_V2_SNAPSHOT_HASHES[name]);
    });
  }
});

describe("editorial v2 snapshots — garde-fous explicites", () => {
  it("Rennes — pas tourisme, montagne, ESS/RGE ni France Services génériques", () => {
    const { analysis } = buildFinalTerritorialAnalysis(rennesProfile);
    const editorial = requireEditorial(analysis);
    const text = collectEditorialText(editorial);

    assertGlobalEditorialPolish(editorial);
    assert.doesNotMatch(text, /montagne/i);
    assert.doesNotMatch(text, /touristique/i);
    assert.doesNotMatch(text, ESS_RGE_LEVER_PATTERN);
    assert.doesNotMatch(text, ESS_RGE_OPPORTUNITY_PATTERN);
    assert.doesNotMatch(text, FRANCE_SERVICES_PATTERN);
    assert.match(editorial.summary, /centralité majeure|grande centralité urbaine/i);
  });

  it("Palaiseau — pas tourisme ni ESS/RGE, centralité locale non répétée", () => {
    const { analysis } = buildFinalTerritorialAnalysis(palaiseauProfile);
    const editorial = requireEditorial(analysis);
    const text = collectEditorialText(editorial);

    assertGlobalEditorialPolish(editorial);
    assert.doesNotMatch(text, /touristique/i);
    assert.doesNotMatch(text, ESS_RGE_LEVER_PATTERN);
    assert.doesNotMatch(text, ESS_RGE_OPPORTUNITY_PATTERN);
    assert.ok(countOccurrences(text, "centralité locale") <= 1);
    assert.doesNotMatch(editorial.summary, /, avec [^,]+, avec /i);
  });

  it("Chamonix — profil montagne touristique conservé", () => {
    const { analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
    const editorial = requireEditorial(analysis);
    const text = collectEditorialText(editorial);

    assertGlobalEditorialPolish(editorial);
    assert.match(
      editorial.summary,
      /ville-centre de montagne|vocation touristique/i,
    );
    assert.ok(
      countOccurrences(
        editorial.summary,
        "ville-centre de montagne à forte vocation touristique",
      ) <= 1,
    );
    assert.ok(
      editorial.opportunities.some((item) =>
        /tourisme|hébergement|fréquentation/i.test(item),
      ),
    );
    assert.doesNotMatch(text, ESS_RGE_LEVER_PATTERN);
    assert.doesNotMatch(text, ESS_RGE_OPPORTUNITY_PATTERN);
  });

  it("Bousse — lecture simple sans suffixe de prudence mécanique", () => {
    const { analysis } = buildFinalTerritorialAnalysis(bousseLikeProfile);
    const editorial = requireEditorial(analysis);
    const text = collectEditorialText(editorial);

    assertGlobalEditorialPolish(editorial);
    assert.match(editorial.summary, /petite commune|couronne périurbaine|périurbain/i);
    for (const strength of editorial.strengths) {
      assert.doesNotMatch(strength, MECHANICAL_PRUDENCE_SUFFIX);
    }
    const distinct = editorial.strengths.filter(
      (item, index) => item !== analysis.strengths[index],
    );
    assert.ok(distinct.length > 0);
  });
});
