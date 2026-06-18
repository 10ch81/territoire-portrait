import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { createPanelProfile, saintGironsProfile } from "./fixtures";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import {
  DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR,
  MEDIAN_INCOME_LOW_WATCH_POINT_THRESHOLD_EUR,
  UNEMPLOYMENT_WATCH_POINT_THRESHOLD_PERCENT,
  isDescriptiveIncomeWatchPointSentence,
  qualifiesAsDebtWatchPoint,
  qualifiesAsIncomeWatchPoint,
  qualifiesAsLowMedianIncomeForWatchPoint,
  qualifiesAsUnemploymentWatchPoint,
} from "./socio-economic-watch-points";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function debtFact(facts: ReturnType<typeof buildAnalysisFacts>) {
  return facts.find((f) => f.theme === "finances" && /dette/i.test(f.sentence));
}

function employmentFact(facts: ReturnType<typeof buildAnalysisFacts>) {
  return facts.find((f) => f.theme === "employment");
}

function incomeSummaryFact(facts: ReturnType<typeof buildAnalysisFacts>) {
  return facts.find((f) => f.theme === "income" && f.target === "summary");
}

function incomeWatchFact(facts: ReturnType<typeof buildAnalysisFacts>) {
  return facts.find((f) => f.theme === "income" && f.target === "watchPoints");
}

describe("socio-economic watch points", () => {
  it("expose des seuils génériques côté serveur", () => {
    assert.equal(UNEMPLOYMENT_WATCH_POINT_THRESHOLD_PERCENT, 10);
    assert.equal(DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR, 1_200);
    assert.equal(MEDIAN_INCOME_LOW_WATCH_POINT_THRESHOLD_EUR, 17_000);
  });

  it("ne code aucune commune ni code INSEE dans le module de seuils", () => {
    const source = readFileSync(
      join(moduleDir, "socio-economic-watch-points.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /\b0\d{4}\b/);
    assert.doesNotMatch(source, /Saint-Girons|09225|99020|99021|99022/i);
  });

  it("chômage modéré — fact cible summary, pas watchPoints", () => {
    const profile = createPanelProfile("moderateEmployment");
    const employment = employmentFact(buildAnalysisFacts(profile));

    assert.ok(employment);
    assert.equal(employment!.target, "summary");
    assert.equal(qualifiesAsUnemploymentWatchPoint(8.2), false);
  });

  it("chômage modéré — absent des watchPoints sélectionnés", () => {
    const profile = createPanelProfile("moderateEmployment");
    const selected = selectAnalysisFactsForPrompt(buildAnalysisFacts(profile), profile);

    assert.ok(
      !selected.some((f) => f.theme === "employment" && f.target === "watchPoints"),
    );
    assert.ok(
      selected.some((f) => f.theme === "employment" && f.target === "summary"),
      "le chômage reste disponible en donnée descriptive",
    );
  });

  it("chômage élevé — éligible watchPoint via seuil", () => {
    const employment = employmentFact(buildAnalysisFacts(saintGironsProfile));

    assert.ok(employment);
    assert.equal(employment!.target, "watchPoints");
    assert.equal(
      qualifiesAsUnemploymentWatchPoint(
        saintGironsProfile.enrichment!.sociodemographics!.unemploymentRate,
      ),
      true,
    );

    const urbanDense = createPanelProfile("urbanDense");
    const urbanEmployment = employmentFact(buildAnalysisFacts(urbanDense));
    assert.equal(urbanEmployment!.target, "watchPoints");
  });

  it("dette faible — fact cible summary", () => {
    const profile = createPanelProfile("lowMunicipalDebt");
    const debt = debtFact(buildAnalysisFacts(profile));

    assert.ok(debt);
    assert.equal(debt!.target, "summary");
    assert.equal(qualifiesAsDebtWatchPoint(650), false);
  });

  it("dette faible — absent des watchPoints sélectionnés", () => {
    const profile = createPanelProfile("lowMunicipalDebt");
    const selected = selectAnalysisFactsForPrompt(buildAnalysisFacts(profile), profile);

    assert.ok(
      !selected.some(
        (f) => f.theme === "finances" && f.target === "watchPoints" && /dette/i.test(f.sentence),
      ),
    );
  });

  it("dette élevée — éligible watchPoint via seuil", () => {
    const profile = createPanelProfile("highMunicipalDebt");
    const debt = debtFact(buildAnalysisFacts(profile));

    assert.ok(debt);
    assert.equal(debt!.target, "watchPoints");
    assert.equal(qualifiesAsDebtWatchPoint(1_850), true);

    const selected = selectAnalysisFactsForPrompt(buildAnalysisFacts(profile), profile);
    assert.ok(
      selected.some(
        (f) => f.theme === "finances" && f.target === "watchPoints" && /dette/i.test(f.sentence),
      ),
    );
  });

  it("croissance démographique avec chômage modéré — pas de watchPoint emploi", () => {
    const profile = createPanelProfile("demographicGrowth");
    const selected = selectAnalysisFactsForPrompt(buildAnalysisFacts(profile), profile);

    assert.ok(
      !selected.some((f) => f.theme === "employment" && f.target === "watchPoints"),
    );
  });

  it("revenu médian élevé — absent des watchPoints sélectionnés", () => {
    const profile = createPanelProfile("residential");
    const facts = buildAnalysisFacts(profile);
    const selected = selectAnalysisFactsForPrompt(facts, profile);

    assert.equal(incomeWatchFact(facts), undefined);
    assert.ok(
      !selected.some((f) => f.theme === "income" && f.target === "watchPoints"),
    );
    assert.equal(qualifiesAsIncomeWatchPoint(profile), false);
  });

  it("revenu médian neutre sans référence — pas de watchPoint automatique", () => {
    const profile = createPanelProfile("moderateEmployment");
    const facts = buildAnalysisFacts(profile);
    const selected = selectAnalysisFactsForPrompt(facts, profile);

    assert.ok(incomeSummaryFact(facts));
    assert.equal(incomeWatchFact(facts), undefined);
    assert.ok(
      !selected.some((f) => f.theme === "income" && f.target === "watchPoints"),
    );
  });

  it("revenu médian faible — watchPoint interprété via seuil", () => {
    const profile = createPanelProfile("urbanDense");
    const facts = buildAnalysisFacts(profile);
    const incomeWatch = incomeWatchFact(facts);

    assert.ok(incomeWatch);
    assert.equal(incomeWatch!.target, "watchPoints");
    assert.equal(
      qualifiesAsLowMedianIncomeForWatchPoint(
        profile.enrichment!.sociodemographics!.medianDisposableIncome,
      ),
      true,
    );
    assert.doesNotMatch(
      incomeWatch!.sentence,
      /Le revenu médian des ménages s'élève à/i,
    );
    assert.match(incomeWatch!.sentence, /repères retenus|fragilité|inférieur/i);

    const selected = selectAnalysisFactsForPrompt(facts, profile);
    assert.ok(
      selected.some((f) => f.theme === "income" && f.target === "watchPoints"),
      "un revenu faible éligible peut entrer en watchPoints",
    );
  });

  it("revenu médian défavorable — watchPoint composite justifié", () => {
    const profile = createPanelProfile("compositeIncomeFragility");
    const facts = buildAnalysisFacts(profile);
    const incomeWatch = incomeWatchFact(facts);

    assert.ok(incomeWatch);
    assert.equal(qualifiesAsIncomeWatchPoint(profile), true);
    assert.match(incomeWatch!.sentence, /fragilité relative/i);
    assert.doesNotMatch(
      incomeWatch!.sentence,
      /Le revenu médian des ménages s'élève à/i,
    );
  });

  it("revenu médian avec comparaison défavorable — watchPoint interprété", () => {
    const profile = createPanelProfile("moderateEmployment");
    const profileWithComparison = {
      ...profile,
      enrichment: {
        ...profile.enrichment!,
        sociodemographics: {
          ...profile.enrichment!.sociodemographics!,
          medianDisposableIncomeDepartmentEur: 22_000,
        },
      },
    };
    const facts = buildAnalysisFacts(profileWithComparison);
    const incomeWatch = incomeWatchFact(facts);

    assert.ok(incomeWatch);
    assert.match(incomeWatch!.sentence, /inférieur à la référence disponible/i);
    assert.equal(isDescriptiveIncomeWatchPointSentence(incomeWatch!.sentence), false);
  });

  it("Saint-Girons — revenu médian neutre absent des watchPoints", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(facts, saintGironsProfile);

    assert.equal(incomeWatchFact(facts), undefined);
    assert.ok(
      !selected.some((f) => f.theme === "income" && f.target === "watchPoints"),
    );
  });
});
