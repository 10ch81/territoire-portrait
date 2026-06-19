import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "../analysis/build-analysis-facts";
import { buildCanonicalAnalysisOutput } from "../analysis/build-canonical-output";
import { createTypologyProfile } from "../analysis/fixtures";
import {
  isEligibleForWatchPoint,
  qualifyAnalysisFact,
  qualifiesAsVacancyWatchPoint,
} from "../analysis/qualify-facts";
import { selectAnalysisFactsForPrompt } from "../analysis/select-facts";
import { buildTerritoryTypology } from "./build-territory-typology";
import { deriveComparisonProfile } from "./comparison-profile";
import {
  vacancyWatchPointThresholdPercent,
} from "./thresholds";

const moduleDir = dirname(fileURLToPath(import.meta.url));

describe("territoryTypology", () => {
  it("ne code aucune commune ni code INSEE dans le module typologie", () => {
    for (const file of [
      "build-territory-typology.ts",
      "comparison-profile.ts",
      "summary-label.ts",
      "thresholds.ts",
      "../analysis/builders/typology.ts",
    ]) {
      const source = readFileSync(join(moduleDir, file), "utf8");
      assert.doesNotMatch(source, /\b0\d{4}\b/);
      assert.doesNotMatch(source, /Saint-Girons|44109|35238|99010/i);
    }
  });

  it("construit territoryTypology sans bloquer le portrait", () => {
    const profile = createTypologyProfile("partialMissing");
    const facts = buildAnalysisFacts(profile);
    const selected = selectAnalysisFactsForPrompt(facts, profile);
    const output = buildCanonicalAnalysisOutput(profile, selected);

    assert.ok(output.summary.length > 20);
    assert.ok(Array.isArray(output.strengths));
    assert.ok(Array.isArray(output.watchPoints));
  });

  it("produit des profils de comparaison stables", () => {
    const metro = createTypologyProfile("metroDense");
    assert.equal(metro.enrichment?.territoryTypology?.comparisonProfile, "metropole");

    const periurban = createTypologyProfile("periurban");
    assert.equal(periurban.enrichment?.territoryTypology?.comparisonProfile, "periurbain");

    const rural = createTypologyProfile("ruralSparse");
    assert.equal(rural.enrichment?.territoryTypology?.comparisonProfile, "rural_isole");
  });

  it("gère les typologies absentes proprement", () => {
    const profile = createTypologyProfile("partialMissing");
    const typology = profile.enrichment!.territoryTypology!;

    assert.deepEqual(typology.availableFamilies, ["density_grid"]);
    assert.ok(typology.missingFamilies.includes("urban_unit"));
  });

  it("facts typologiques neutral par défaut et hors watchPoints", () => {
    const profile = createTypologyProfile("pvd");
    const facts = buildAnalysisFacts(profile).filter((fact) => fact.theme === "geography");

    assert.ok(facts.length > 0);
    for (const fact of facts) {
      const qualified = qualifyAnalysisFact(fact, { territory: profile });
      assert.equal(qualified.polarity, "neutral");
      assert.equal(isEligibleForWatchPoint(qualified), false);
    }

    const selected = selectAnalysisFactsForPrompt(facts, profile);
    assert.ok(!selected.some((fact) => fact.target === "watchPoints"));
  });

  it("résumé déterministe avec fragment typologique sans label interne", () => {
    const profile = createTypologyProfile("metroDense");
    const facts = buildAnalysisFacts(profile);
    const selected = selectAnalysisFactsForPrompt(facts, profile);
    const summary = buildCanonicalAnalysisOutput(profile, selected).summary;

    assert.match(summary, /commune dense de grande agglomération/);
    assert.doesNotMatch(summary, /metropole|comparisonProfile|density_grid/i);
  });

  it("résumé inchangé si summaryLabel absent", () => {
    const profile = createTypologyProfile("noPolicy");
    const withoutLabel = {
      ...profile,
      enrichment: {
        ...profile.enrichment!,
        territoryTypology: {
          ...profile.enrichment!.territoryTypology!,
          summaryLabel: undefined,
        },
      },
    };

    const facts = buildAnalysisFacts(withoutLabel);
    const selected = selectAnalysisFactsForPrompt(facts, withoutLabel);
    const summary = buildCanonicalAnalysisOutput(withoutLabel, selected).summary;

    assert.match(summary, /commune de .* habitants/);
    assert.doesNotMatch(summary, /comparisonProfile/);
  });

  it("scoring vacance sensible au comparisonProfile", () => {
    const metro = createTypologyProfile("metroDense");
    const rural = createTypologyProfile("ruralSparse");
    const rate = 8.7;

    assert.equal(
      qualifiesAsVacancyWatchPoint(rate, metro),
      true,
      "seuil métropole plus strict",
    );
    assert.equal(
      qualifiesAsVacancyWatchPoint(rate, rural),
      false,
      "seuil rural plus tolérant",
    );
    assert.equal(vacancyWatchPointThresholdPercent("metropole"), 8);
    assert.equal(vacancyWatchPointThresholdPercent("rural_isole"), 15);
  });

  it("deriveComparisonProfile sans règle locale codée en dur", () => {
    const profile = deriveComparisonProfile({
      population: 250_000,
      densityGrid: {
        levelCode: "1",
        simplifiedLabel: "commune très dense",
        source: "INSEE",
        available: true,
        note: "",
      },
      attractionArea: {
        role: "pole",
        categoryCode: "11",
        source: "INSEE",
        available: true,
        note: "",
      },
      urbanUnit: {
        belongsToUrbanUnit: true,
        role: "ville_centre",
        sizeClass: "7",
        source: "INSEE",
        available: true,
        note: "",
      },
    });

    assert.equal(profile, "metropole");
  });

  it("buildTerritoryTypology réutilise un objet préconstruit", () => {
    const profile = createTypologyProfile("acv");
    const built = buildTerritoryTypology({ territory: profile });
    assert.equal(built.comparisonProfile, "ville_moyenne");
    assert.equal(built.publicPolicyTypologies?.actionCoeurDeVille, true);
  });
});
