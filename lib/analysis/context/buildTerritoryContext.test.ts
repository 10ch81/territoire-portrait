import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTerritoryContext,
  HIGH_TOURISM_CAPACITY_PER_RESIDENT_RATIO,
  tourismAccommodationRatio,
} from "./buildTerritoryContext";
import { chamonixProfile, palaiseauProfile } from "../reference-communes";

describe("buildTerritoryContext — Palaiseau (91477)", () => {
  const context = buildTerritoryContext(palaiseauProfile);

  it("profil urbain dense avec centralité et croissance", () => {
    assert.equal(context.isSmallPopulation, false);
    assert.equal(context.isDenseUrban, true);
    assert.equal(context.isCentralityInEpci, true);
    assert.equal(context.hasStrongPopulationGrowth, true);
    assert.equal(context.hasPopulationDecline, false);
  });

  it("tourisme présent mais sans ratio élevé par habitant", () => {
    assert.equal(context.isTouristCommune, true);

    const ratio = tourismAccommodationRatio(palaiseauProfile);
    assert.ok(ratio !== null && ratio < HIGH_TOURISM_CAPACITY_PER_RESIDENT_RATIO);

    assert.equal(context.hasHighTourismCapacityPerResident, false);
    assert.equal(context.requiresPerCapitaCaution, true);
  });

  it("pression immobilière et base emploi élevées", () => {
    assert.equal(context.hasHighRealEstatePressure, true);
    assert.equal(context.hasHighEmploymentBase, true);
  });

  it("pas de profil montagne ou risque alpin déductible", () => {
    assert.equal(context.isMountainOrNaturalRiskProfile, false);
  });

  it("grande ville et pas de risque petits effectifs sécurité", () => {
    assert.equal(context.isLargeCity, false);
    assert.equal(context.population, palaiseauProfile.population);
  });
});

describe("buildTerritoryContext — Chamonix (74056)", () => {
  const context = buildTerritoryContext(chamonixProfile);

  it("commune touristique de montagne avec prudence par habitant", () => {
    assert.equal(context.isDenseUrban, false);
    assert.equal(context.isTouristCommune, true);
    assert.equal(context.isMountainOrNaturalRiskProfile, true);
    assert.equal(context.hasHighTourismCapacityPerResident, true);
    assert.equal(context.hasTourismEmploymentProfile, true);
    assert.equal(context.requiresPerCapitaCaution, true);

    const ratio = tourismAccommodationRatio(chamonixProfile);
    assert.ok(ratio !== null && ratio >= HIGH_TOURISM_CAPACITY_PER_RESIDENT_RATIO);
  });

  it("recul démographique et centralité EPCI", () => {
    assert.equal(context.hasPopulationDecline, true);
    assert.equal(context.hasStrongPopulationGrowth, false);
    assert.equal(context.isCentralityInEpci, true);
  });

  it("pression immobilière et emploi salarié élevés par habitant", () => {
    assert.equal(context.hasHighRealEstatePressure, true);
    assert.equal(context.hasHighEmploymentBase, true);
  });
});

describe("buildTerritoryContext — données absentes", () => {
  it("retourne null quand les données sources manquent", () => {
    const context = buildTerritoryContext({
      ...palaiseauProfile,
      population: null,
      densityPerKm2: null,
      enrichment: null,
    });

    assert.equal(context.isSmallPopulation, null);
    assert.equal(context.isDenseUrban, null);
    assert.equal(context.isTouristCommune, null);
    assert.equal(context.requiresPerCapitaCaution, null);
  });
});
