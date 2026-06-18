import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePopulationGrowthFromHistory,
  isDemographicAgeCrossing,
  isDemographicEvolutionContext,
  percentMatchesAgeAggregate,
  percentMatchesPopulationGrowth,
} from "./demographic-indicators";

describe("demographic-indicators", () => {
  it("calcule la croissance démographique à partir de l'historique", () => {
    const growth = computePopulationGrowthFromHistory([
      { year: 2010, population: 6_560 },
      { year: 2022, population: 6_184 },
    ]);

    assert.equal(growth.fromYear, 2010);
    assert.equal(growth.toYear, 2022);
    assert.equal(growth.percent, -5.7);
  });

  it("détecte un contexte d'évolution démographique", () => {
    assert.equal(
      isDemographicEvolutionContext("Recul démographique modéré entre 2010 et 2022"),
      true,
    );
    assert.equal(isDemographicEvolutionContext("Part élevée des 60 ans et plus"), false);
  });

  it("distingue croissance et part des 60 ans et plus", () => {
    assert.equal(percentMatchesPopulationGrowth(-5.7, -5.7), true);
    assert.equal(percentMatchesAgeAggregate(38.1, 38.1), true);
    assert.equal(percentMatchesAgeAggregate(-38.1, 38.1), true);
    assert.equal(isDemographicAgeCrossing(-38.1, -5.7, 38.1), true);
    assert.equal(isDemographicAgeCrossing(-5.7, -5.7, 38.1), false);
  });
});
