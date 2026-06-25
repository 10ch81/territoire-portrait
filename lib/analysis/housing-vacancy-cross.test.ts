import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPanelProfile, HOUSING_RP_EXTRA } from "./fixtures";
import type { PropertyMarketSnapshot, TerritoryEnrichment, TerritoryProfile } from "../types";
import {
  buildDualVacancyWatchPointSentence,
  buildVacancyPriceTensionWatchPointSentence,
  computeLovacRpVacancySpreadPercent,
  computeRealEstatePremiumRatio,
  isDualVacancyWatchPointFact,
  isVacancyPriceTensionWatchPointFact,
  qualifiesAsDualVacancy,
  qualifiesAsRealEstatePremium,
  qualifiesAsVacancyPriceTension,
  shouldEmitVacancyPriceTensionWatchPoint,
} from "./housing-vacancy-cross";

const ruralTypology = {
  summaryLabel: "Commune rurale",
  comparisonProfile: "rural" as const,
  availableFamilies: ["density_grid"],
  missingFamilies: [],
};

const premiumProperty: PropertyMarketSnapshot = {
  year: 2024,
  averagePricePerM2: 1_600,
  averageTransactionPrice: 185_000,
  mutationCount: 114,
  houseMutations: 80,
  apartmentMutations: 34,
  houseSharePercent: null,
  apartmentSharePercent: null,
  priceHistory: [],
  departmentCode: "09",
  departmentAveragePricePerM2: 1_300,
  available: true,
  note: "",
};

function withHousing(
  profile: TerritoryProfile,
  housing: NonNullable<TerritoryEnrichment["housing"]>,
  property?: PropertyMarketSnapshot,
): TerritoryProfile {
  return {
    ...profile,
    enrichment: {
      ...profile.enrichment!,
      housing,
      property: property ?? profile.enrichment?.property ?? null,
      territoryTypology: ruralTypology,
    },
  };
}

describe("housing-vacancy-cross", () => {
  it("qualifiesAsDualVacancy — rural, RP et LOVAC au-dessus du seuil (15 %)", () => {
    const profile = withHousing(createPanelProfile("ruralSparse"), {
      year: 2022,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      totalDwellings: 800,
      rpVacantDwellings: 120,
      rpVacancyRatePercent: 16,
      socialHousingSharePercent: 0,
      vacancyRatePercent: null,
      privateVacantDwellings: 100,
      privateVacancyRatePercent: 17,
      privateVacantStructural: 40,
      lovacVintage: 2025,
      lovacNote: null,
      available: true,
      note: "",
      ...HOUSING_RP_EXTRA,
    });

    assert.equal(qualifiesAsDualVacancy(profile), true);
  });

  it("qualifiesAsDualVacancy — faux si un seul registre au-dessus du seuil", () => {
    const base = createPanelProfile("ruralSparse");
    const onlyLovac = withHousing(base, {
      year: 2022,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      totalDwellings: 800,
      rpVacantDwellings: 40,
      rpVacancyRatePercent: 5,
      socialHousingSharePercent: 0,
      vacancyRatePercent: null,
      privateVacantDwellings: 120,
      privateVacancyRatePercent: 16,
      privateVacantStructural: 42,
      lovacVintage: 2025,
      lovacNote: null,
      available: true,
      note: "",
      ...HOUSING_RP_EXTRA,
    });

    assert.equal(qualifiesAsDualVacancy(onlyLovac), false);
  });

  it("buildDualVacancyWatchPointSentence — millésimes et registres distincts", () => {
    const profile = withHousing(createPanelProfile("ruralSparse"), {
      year: 2022,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      totalDwellings: 800,
      rpVacantDwellings: 120,
      rpVacancyRatePercent: 16,
      socialHousingSharePercent: 0,
      vacancyRatePercent: null,
      privateVacantDwellings: 100,
      privateVacancyRatePercent: 17,
      privateVacantStructural: 40,
      lovacVintage: 2025,
      lovacNote: null,
      available: true,
      note: "",
      ...HOUSING_RP_EXTRA,
    });

    const sentence = buildDualVacancyWatchPointSentence(profile.enrichment!.housing!);
    assert.match(sentence, /deux registres distincts/i);
    assert.match(sentence, /recensement 2022/i);
    assert.match(sentence, /1er janvier 2025/i);
    assert.match(sentence, /40 vacants depuis au moins deux ans/);
  });

  it("isDualVacancyWatchPointFact — deux sourceKeys requises, sans DVF", () => {
    assert.equal(
      isDualVacancyWatchPointFact({
        sourceKeys: ["insee-rp-logement", "cerema-lovac"],
      }),
      true,
    );
    assert.equal(
      isDualVacancyWatchPointFact({
        sourceKeys: ["insee-rp-logement", "cerema-lovac", "dvf"],
      }),
      false,
    );
    assert.equal(
      isDualVacancyWatchPointFact({ sourceKeys: ["cerema-lovac"] }),
      false,
    );
  });

  it("qualifiesAsVacancyPriceTension — LOVAC élevé et prime DVF robuste", () => {
    const profile = withHousing(
      createPanelProfile("ruralSparse"),
      {
        year: 2022,
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        totalDwellings: 800,
        rpVacantDwellings: 40,
        rpVacancyRatePercent: 5,
        socialHousingSharePercent: 0,
        vacancyRatePercent: null,
        privateVacantDwellings: 120,
        privateVacancyRatePercent: 16,
        privateVacantStructural: 42,
        lovacVintage: 2025,
        lovacNote: null,
        available: true,
        note: "",
        ...HOUSING_RP_EXTRA,
      },
      premiumProperty,
    );

    assert.equal(qualifiesAsRealEstatePremium(profile), true);
    assert.equal(computeRealEstatePremiumRatio(profile), 1.2);
    assert.equal(computeLovacRpVacancySpreadPercent(profile), 11);
    assert.equal(qualifiesAsVacancyPriceTension(profile), true);
    assert.equal(shouldEmitVacancyPriceTensionWatchPoint(profile), true);
    assert.match(
      buildVacancyPriceTensionWatchPointSentence(profile),
      /sans permettre d'en attribuer la cause/i,
    );
  });

  it("shouldEmitVacancyPriceTensionWatchPoint — faux si dual vacance (watch consolidé)", () => {
    const profile = withHousing(
      createPanelProfile("ruralSparse"),
      {
        year: 2022,
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        totalDwellings: 800,
        rpVacantDwellings: 128,
        rpVacancyRatePercent: 16,
        socialHousingSharePercent: 0,
        vacancyRatePercent: null,
        privateVacantDwellings: 120,
        privateVacancyRatePercent: 17,
        privateVacantStructural: 40,
        lovacVintage: 2025,
        lovacNote: null,
        available: true,
        note: "",
        ...HOUSING_RP_EXTRA,
      },
      premiumProperty,
    );

    assert.equal(qualifiesAsVacancyPriceTension(profile), true);
    assert.equal(shouldEmitVacancyPriceTensionWatchPoint(profile), false);
  });

  it("isVacancyPriceTensionWatchPointFact — DVF et au moins un registre vacance", () => {
    assert.equal(
      isVacancyPriceTensionWatchPointFact({
        sourceKeys: ["dvf", "cerema-lovac"],
      }),
      true,
    );
    assert.equal(
      isVacancyPriceTensionWatchPointFact({ sourceKeys: ["dvf"] }),
      false,
    );
  });
});
