import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { buildTerritoryContext } from "./context/buildTerritoryContext";
import { rennesLikeProfile } from "./contextual-reference-profiles";
import {
  isEditoriallyStrongFact,
  isEssRgeAdministrativeInventory,
  isTourismAccommodationStrength,
} from "./editorial-relevance";
import { chamonixProfile, palaiseauProfile } from "./reference-communes";
import { selectAnalysisFactsForPrompt } from "./select-facts";

describe("editorial-relevance", () => {
  it("bloque l'hébergement touristique hors commune touristique", () => {
    const facts = buildAnalysisFacts(palaiseauProfile);
    const tourism = facts.find(
      (fact) => fact.theme === "tourism" && fact.target === "strengths",
    );
    assert.ok(tourism);
    const context = buildTerritoryContext(palaiseauProfile);
    assert.equal(isTourismAccommodationStrength(tourism!, context), false);
    assert.equal(isEditoriallyStrongFact(tourism!, context), false);
  });

  it("autorise l'hébergement touristique pour Chamonix", () => {
    const facts = buildAnalysisFacts(chamonixProfile);
    const tourism = facts.find(
      (fact) => fact.theme === "tourism" && fact.target === "strengths",
    );
    assert.ok(tourism);
    const context = buildTerritoryContext(chamonixProfile);
    assert.equal(isTourismAccommodationStrength(tourism!, context), true);
    assert.equal(isEditoriallyStrongFact(tourism!, context), true);
  });

  it("déclasse l'inventaire ESS/RGE administratif", () => {
    const facts = buildAnalysisFacts(palaiseauProfile);
    const ess = facts.find((fact) => fact.theme === "ess_rge" && fact.target === "strengths");
    assert.ok(ess);
    assert.equal(isEssRgeAdministrativeInventory(ess!), true);
    const context = buildTerritoryContext(palaiseauProfile);
    assert.equal(isEditoriallyStrongFact(ess!, context), false);
  });

  it("Rennes-like — sélection sans tourisme ni ESS/RGE en strengths", () => {
    const facts = buildAnalysisFacts(rennesLikeProfile);
    const selected = selectAnalysisFactsForPrompt(facts, rennesLikeProfile);
    const strengths = selected.filter((fact) => fact.target === "strengths");

    assert.ok(
      !strengths.some((fact) => /places d'hébergement touristique/i.test(fact.sentence)),
    );
    assert.ok(!strengths.some((fact) => fact.theme === "ess_rge"));
  });
});
