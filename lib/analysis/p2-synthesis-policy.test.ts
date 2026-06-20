import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { buildIncomeWatchPointSentence } from "./socio-economic-watch-points";
import { createPanelProfile, saintGironsProfile } from "./fixtures";
import { extractHeroKpis } from "../ux/kpis";
import type { TerritoryEnrichment, TerritoryProfile } from "../types";

function withEnrichment(
  profile: TerritoryProfile,
  patch: Partial<TerritoryEnrichment>,
): TerritoryProfile {
  return {
    ...profile,
    enrichment: {
      ...profile.enrichment!,
      ...patch,
    },
  };
}

const ruralTypology = {
  summaryLabel: "Commune rurale",
  comparisonProfile: "rural" as const,
  availableFamilies: ["density_grid"],
  missingFamilies: [],
};

describe("politique synthèse sources P2", () => {
  it("LOVAC B1 — watch point si taux parc privé au-dessus du seuil rural (RP seul sous seuil)", () => {
    const base = createPanelProfile("ruralSparse");
    const profile = withEnrichment(base, {
      housing: {
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
      },
      territoryTypology: ruralTypology,
    });

    const facts = buildAnalysisFacts(profile);
    const lovac = facts.find(
      (fact) =>
        fact.sourceKeys.includes("cerema-lovac") &&
        !fact.sourceKeys.includes("insee-rp-logement"),
    );

    assert.ok(lovac);
    assert.equal(lovac!.target, "watchPoints");
    assert.match(lovac!.sentence, /LOVAC/);
    assert.match(lovac!.sentence, /42 vacants depuis au moins deux ans/);
    assert.ok(
      !facts.some(
        (fact) =>
          fact.target === "watchPoints" &&
          fact.sourceKeys.includes("insee-rp-logement") &&
          fact.sourceKeys.includes("cerema-lovac"),
      ),
    );
  });

  it("dual vacance — watchPoint consolidé (D3) si RP et LOVAC au-dessus du seuil rural", () => {
    const profile = withEnrichment(createPanelProfile("ruralSparse"), {
      housing: {
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
        privateVacantStructural: 42,
        lovacVintage: 2025,
        lovacNote: null,
        available: true,
        note: "",
      },
      territoryTypology: ruralTypology,
    });

    const facts = buildAnalysisFacts(profile);
    const composite = facts.find(
      (fact) =>
        fact.target === "watchPoints" &&
        fact.sourceKeys.includes("insee-rp-logement") &&
        fact.sourceKeys.includes("cerema-lovac"),
    );
    const rpWatch = facts.find(
      (fact) =>
        fact.target === "watchPoints" &&
        fact.sourceKeys.length === 1 &&
        fact.sourceKeys.includes("insee-rp-logement") &&
        /logements vacants/i.test(fact.sentence),
    );
    const lovacWatch = facts.find(
      (fact) =>
        fact.target === "watchPoints" &&
        fact.sourceKeys.length === 1 &&
        fact.sourceKeys.includes("cerema-lovac"),
    );
    const rpSummary = facts.find(
      (fact) =>
        fact.target === "summary" &&
        fact.sourceKeys.includes("insee-rp-logement") &&
        /logements vacants/i.test(fact.sentence),
    );
    const lovacSummary = facts.find(
      (fact) =>
        fact.target === "summary" &&
        fact.sourceKeys.includes("cerema-lovac"),
    );

    assert.ok(composite);
    assert.match(composite!.sentence, /deux registres distincts/i);
    assert.equal(rpWatch, undefined);
    assert.equal(lovacWatch, undefined);
    assert.ok(rpSummary);
    assert.ok(lovacSummary);
  });

  it("vacance + prix DVF — watchPoint consolidé si LOVAC élevé et prime immobilière (D3)", () => {
    const profile = withEnrichment(createPanelProfile("ruralSparse"), {
      housing: {
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
      },
      property: {
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
      },
      territoryTypology: ruralTypology,
    });

    const facts = buildAnalysisFacts(profile);
    const priceTension = facts.find(
      (fact) =>
        fact.target === "watchPoints" &&
        fact.sourceKeys.includes("dvf") &&
        fact.sourceKeys.includes("cerema-lovac"),
    );
    const lovacWatch = facts.find(
      (fact) =>
        fact.target === "watchPoints" &&
        fact.sourceKeys.length === 1 &&
        fact.sourceKeys.includes("cerema-lovac"),
    );
    const lovacSummary = facts.find(
      (fact) =>
        fact.target === "summary" &&
        fact.sourceKeys.includes("cerema-lovac"),
    );

    assert.ok(priceTension);
    assert.match(priceTension!.sentence, /sans permettre d'en attribuer la cause/i);
    assert.equal(lovacWatch, undefined);
    assert.ok(lovacSummary);
  });

  it("dual vacance + prime DVF — note de discordance prix dans les limites du watchPoint dual", () => {
    const profile = withEnrichment(createPanelProfile("ruralSparse"), {
      housing: {
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
        privateVacantStructural: 42,
        lovacVintage: 2025,
        lovacNote: null,
        available: true,
        note: "",
      },
      property: {
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
      },
      territoryTypology: ruralTypology,
    });

    const facts = buildAnalysisFacts(profile);
    const composite = facts.find(
      (fact) =>
        fact.target === "watchPoints" &&
        fact.sourceKeys.includes("insee-rp-logement") &&
        fact.sourceKeys.includes("cerema-lovac") &&
        !fact.sourceKeys.includes("dvf"),
    );
    const separatePriceTension = facts.find(
      (fact) => fact.target === "watchPoints" && fact.sourceKeys.includes("dvf"),
    );

    assert.ok(composite);
    assert.ok(
      composite!.limitations?.some((line) => /référence départementale/i.test(line)),
    );
    assert.equal(separatePriceTension, undefined);
  });

  it("LOVAC B1 — aucun fait si sous le seuil typologique", () => {
    const profile = withEnrichment(createPanelProfile("ruralSparse"), {
      housing: {
        year: 2022,
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        totalDwellings: 800,
        rpVacantDwellings: 40,
        rpVacancyRatePercent: 5,
        socialHousingSharePercent: 0,
        vacancyRatePercent: null,
        privateVacantDwellings: 20,
        privateVacancyRatePercent: 9,
        privateVacantStructural: 5,
        lovacVintage: 2025,
        lovacNote: null,
        available: true,
        note: "",
      },
      territoryTypology: ruralTypology,
    });

    const facts = buildAnalysisFacts(profile);
    assert.ok(!facts.some((fact) => fact.sourceKeys.includes("cerema-lovac")));
  });

  it("France Travail — KPI hero si chômage RP documenté, pas de fait analyse", () => {
    const profile = withEnrichment(createPanelProfile("urbanDense"), {
      labourMarket: {
        quarter: "2024-T4",
        totalJobSeekers: 3_450,
        categoryA: 900,
        under25: 620,
        age50AndOver: 890,
        longTerm: 410,
        available: true,
        note: "Effectifs arrondis.",
      },
    });

    const facts = buildAnalysisFacts(profile);
    assert.ok(!facts.some((fact) => fact.sourceKeys.includes("france-travail-defm")));

    const kpis = extractHeroKpis(profile);
    assert.ok(kpis.some((kpi) => kpi.id === "france-travail"));
  });

  it("France Travail — watch point si chômage RP indisponible", () => {
    const profile = withEnrichment(createPanelProfile("ruralSparse"), {
      sociodemographics: {
        year: 2022,
        incomeYear: 2023,
        ageBands: [],
        unemploymentRate: null,
        medianDisposableIncome: 19_200,
        available: true,
        note: "",
      },
      labourMarket: {
        quarter: "2024-T4",
        totalJobSeekers: 85,
        categoryA: 20,
        under25: 12,
        age50AndOver: 20,
        longTerm: 8,
        available: true,
        note: "Effectifs arrondis.",
      },
    });

    const facts = buildAnalysisFacts(profile);
    const ft = facts.find((fact) => fact.sourceKeys.includes("france-travail-defm"));

    assert.ok(ft);
    assert.equal(ft!.target, "watchPoints");
  });

  it("IPS A1 — aucun fait IPS dans la synthèse", () => {
    const profile = withEnrichment(saintGironsProfile, {
      education: {
        ...saintGironsProfile.enrichment!.education!,
        averageIps: 112,
        ipsSchoolYear: "2024-2025",
        schoolsWithIps: 3,
        ipsMin: 95,
        ipsMax: 128,
        ipsNote: "IPS agrégé.",
      },
    });

    const facts = buildAnalysisFacts(profile);
    assert.ok(!facts.some((fact) => fact.sourceKeys.includes("depp-ips-ecoles")));
  });

  it("RSA B2 — pas de fait isolé, renfort du watch revenu composite", () => {
    const profile = withEnrichment(createPanelProfile("compositeIncomeFragility"), {
      socialBenefits: {
        rsaVintage: 2023,
        rsaShareAmongHouseholdsPercent: 12,
        available: true,
        note: "Part RSA CNAF.",
      },
    });

    const facts = buildAnalysisFacts(profile);
    assert.ok(!facts.some((fact) => fact.sourceKeys.includes("cnaf-precarite")));

    const incomeWatch = facts.find(
      (fact) => fact.theme === "income" && fact.target === "watchPoints",
    );
    assert.ok(incomeWatch);
    assert.match(buildIncomeWatchPointSentence(profile), /RSA/);
    assert.match(buildIncomeWatchPointSentence(profile), /CNAF/);
  });
});
