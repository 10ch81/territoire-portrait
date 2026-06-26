import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { createPanelProfile, HOUSING_RP_EXTRA } from "./fixtures";
import {
  isEligibleForWatchPoint,
  qualifyAnalysisFact,
  qualifiesAsVacancyWatchPoint,
} from "./qualify-facts";
import { selectAnalysisFactsForPrompt } from "./select-facts";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function selectedWatchThemes(profile: ReturnType<typeof createPanelProfile>) {
  const facts = buildAnalysisFacts(profile);
  const selected = selectAnalysisFactsForPrompt(facts, profile);
  return selected.filter((f) => f.target === "watchPoints");
}

describe("qualifyAnalysisFact — watchPoints", () => {
  it("ne code aucune commune ni code INSEE dans le module de qualification", () => {
    const source = readFileSync(join(moduleDir, "qualify-facts.ts"), "utf8");
    assert.doesNotMatch(source, /\b0\d{4}\b/);
    assert.doesNotMatch(source, /Saint-Girons|09225|99020|99021|99022|99023|99024/i);
  });

  it("vacance faible — neutral, pas de watchPoint", () => {
    const profile = createPanelProfile("residential");
    const facts = buildAnalysisFacts(profile);
    const vacancy = facts.find(
      (f) => f.theme === "housing" && /logements vacants/i.test(f.sentence),
    );

    assert.ok(vacancy);
    assert.equal(
      qualifiesAsVacancyWatchPoint(profile.enrichment!.housing!.rpVacancyRatePercent),
      false,
    );

    const qualified = qualifyAnalysisFact(vacancy!, { territory: profile });
    assert.equal(qualified.polarity, "neutral");
    assert.equal(isEligibleForWatchPoint(qualified), false);

    const watchPoints = selectedWatchThemes(profile);
    assert.ok(!watchPoints.some((f) => /logements vacants/i.test(f.sentence)));
  });

  it("vacance élevée — negative, watchPoint possible", () => {
    const profile = createPanelProfile("moderateEmployment");
    const facts = buildAnalysisFacts(profile);
    const vacancy = facts.find(
      (f) => f.theme === "housing" && /logements vacants/i.test(f.sentence),
    );

    assert.ok(vacancy);
    const qualified = qualifyAnalysisFact(vacancy!, { territory: profile });
    assert.equal(qualified.polarity, "negative");
    assert.equal(isEligibleForWatchPoint(qualified), true);

    const watchPoints = selectedWatchThemes(profile);
    assert.ok(watchPoints.some((f) => /logements vacants/i.test(f.sentence)));
  });

  it("chômage modéré — neutral, pas de watchPoint", () => {
    const profile = createPanelProfile("moderateEmployment");
    const employment = buildAnalysisFacts(profile).find((f) => f.theme === "employment");

    assert.ok(employment);
    const qualified = qualifyAnalysisFact(employment!, { territory: profile });
    assert.equal(qualified.polarity, "neutral");
    assert.equal(isEligibleForWatchPoint(qualified), false);
    assert.ok(!selectedWatchThemes(profile).some((f) => f.theme === "employment"));
  });

  it("chômage élevé — negative, watchPoint possible", () => {
    const profile = createPanelProfile("urbanDense");
    const employment = buildAnalysisFacts(profile).find((f) => f.theme === "employment");

    assert.ok(employment);
    const qualified = qualifyAnalysisFact(employment!, { territory: profile });
    assert.equal(qualified.polarity, "negative");
    assert.equal(isEligibleForWatchPoint(qualified), true);
    assert.ok(selectedWatchThemes(profile).some((f) => f.theme === "employment"));
  });

  it("revenu favorable ou neutre — pas de watchPoint", () => {
    const profile = createPanelProfile("residential");
    const income = buildAnalysisFacts(profile).find(
      (f) => f.theme === "income" && f.target === "summary",
    );

    assert.ok(income);
    const qualified = qualifyAnalysisFact(income!, { territory: profile });
    assert.notEqual(qualified.polarity, "negative");
    assert.equal(isEligibleForWatchPoint(qualified), false);
    assert.ok(!selectedWatchThemes(profile).some((f) => f.theme === "income"));
  });

  it("revenu défavorable — watchPoint interprété possible", () => {
    const profile = createPanelProfile("urbanDense");
    const incomeWatch = buildAnalysisFacts(profile).find(
      (f) => f.theme === "income" && f.target === "watchPoints",
    );

    assert.ok(incomeWatch);
    const qualified = qualifyAnalysisFact(incomeWatch!, { territory: profile });
    assert.equal(qualified.polarity, "negative");
    assert.equal(isEligibleForWatchPoint(qualified), true);
    assert.doesNotMatch(incomeWatch!.sentence, /s'élève à/i);
  });

  it("dette faible — neutral sur dette/hab, pas de watchPoint", () => {
    const profile = createPanelProfile("lowMunicipalDebt");
    const debt = buildAnalysisFacts(profile).find(
      (f) => f.theme === "finances" && /€ par habitant/i.test(f.sentence),
    );

    assert.ok(debt);
    const qualified = qualifyAnalysisFact(debt!, { territory: profile });
    assert.equal(qualified.polarity, "neutral");
    assert.equal(isEligibleForWatchPoint(qualified), false);
    assert.ok(
      !selectedWatchThemes(profile).some(
        (f) => f.theme === "finances" && /annuité de la dette/i.test(f.sentence),
      ),
    );
  });

  it("dette élevée — negative sur annuité/recettes, watchPoint possible", () => {
    const profile = createPanelProfile("highMunicipalDebt");
    const debtRatio = buildAnalysisFacts(profile).find(
      (f) => f.theme === "finances" && /annuité de la dette/i.test(f.sentence),
    );

    assert.ok(debtRatio);
    const qualified = qualifyAnalysisFact(debtRatio!, { territory: profile });
    assert.equal(qualified.polarity, "negative");
    assert.equal(isEligibleForWatchPoint(qualified), true);
    assert.ok(
      selectedWatchThemes(profile).some(
        (f) => f.theme === "finances" && /annuité de la dette/i.test(f.sentence),
      ),
    );
  });

  it("sécurité non défavorable — pas de watchPoint", () => {
    const profile = createPanelProfile("lowSsmsi");
    const security = buildAnalysisFacts(profile).find((f) => f.theme === "security");

    assert.equal(security, undefined);
    assert.ok(!selectedWatchThemes(profile).some((f) => f.theme === "security"));
  });

  it("sécurité défavorable — watchPoint possible", () => {
    const profile = createPanelProfile("urbanDense");
    const security = buildAnalysisFacts(profile).find((f) => f.theme === "security");

    assert.ok(security);
    const qualified = qualifyAnalysisFact(security!, { territory: profile });
    assert.equal(qualified.polarity, "negative");
    assert.equal(isEligibleForWatchPoint(qualified), true);
    assert.ok(selectedWatchThemes(profile).some((f) => f.theme === "security"));
  });

  it("RPLS absent — pas de watchPoint automatique", () => {
    const profile = createPanelProfile("withoutQpv");
    const enriched = {
      ...profile,
      enrichment: {
        ...profile.enrichment!,
        housing: {
          year: 2022,
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          totalDwellings: 2_000,
          rpVacantDwellings: 40,
          rpVacancyRatePercent: 2.0,
          socialHousingSharePercent: 0,
          vacancyRatePercent: null,
          lovacVintage: null,
          privateVacantDwellings: null,
          privateVacancyRatePercent: null,
          privateVacantStructural: null,
          lovacNote: null,
          available: true,
          note: "",
          ...HOUSING_RP_EXTRA,
        },
      },
    };
    const rpls = buildAnalysisFacts(enriched).find((f) => f.theme === "social_housing");

    assert.ok(rpls);
    const qualified = qualifyAnalysisFact(rpls!, { territory: enriched });
    assert.notEqual(qualified.polarity, "negative");
    assert.equal(isEligibleForWatchPoint(qualified), false);
    assert.ok(!selectedWatchThemes(enriched).some((f) => f.theme === "social_housing"));
  });

  it("risques naturels documentés — watchPoint séparé de sécurité", () => {
    const profile = createPanelProfile("coastal");
    const watchPoints = selectedWatchThemes(profile);

    assert.ok(watchPoints.some((f) => f.theme === "risks"));
    assert.ok(!watchPoints.some((f) => f.theme === "security"));
  });

  it("fallback court — deux vrais enjeux, pas de remplissage neutre", () => {
    const profile = createPanelProfile("twoNegativeEnjeux");
    const watchPoints = selectedWatchThemes(profile);

    assert.equal(watchPoints.length, 2);
    assert.ok(watchPoints.some((f) => f.theme === "employment"));
    assert.ok(watchPoints.some((f) => f.theme === "risks"));
    assert.ok(!watchPoints.some((f) => f.theme === "security"));
    assert.ok(!watchPoints.some((f) => f.theme === "social_housing"));
    assert.ok(!watchPoints.some((f) => f.theme === "income"));
    assert.ok(!watchPoints.some((f) => /logements vacants/i.test(f.sentence)));
  });
});
