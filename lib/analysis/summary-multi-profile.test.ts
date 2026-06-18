import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeDataLimits } from "../data-limits";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { buildCanonicalAnalysisOutput } from "./build-canonical-output";
import { createPanelProfile, saintGironsProfile, type PanelPreset } from "./fixtures";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import { hasUnreadySummaryFragments, issuePhrasesAreGrammatical } from "./summary-compose";
import {
  extractDemographySnapshot,
  hasAwkwardSummaryConcatenation,
  summaryMentionsAbsentSources,
  summaryMislabelsGrowthAsDecline,
} from "./summary-phrases";
import { hasSummaryAssetPhrase, hasSummaryIssuePhrase } from "./summary-fragments";
import { validateAnalysisOutput } from "./validate-output";

const SUMMARY_PROFILES: PanelPreset[] = [
  "demographicGrowth",
  "ruralSparse",
  "urbanDense",
  "periurban",
  "withoutQpv",
  "withQpv",
  "sireneCapped",
  "withArcep",
  "industrial",
  "coastal",
  "fullEnrichment",
];

function buildValidatedSummary(preset: PanelPreset) {
  const territory = createPanelProfile(preset);
  const allFacts = buildAnalysisFacts(territory);
  const selected = selectAnalysisFactsForPrompt(allFacts, territory);
  const canonical = buildCanonicalAnalysisOutput(territory, selected);
  const result = validateAnalysisOutput(canonical, selected, territory);
  return { territory, allFacts, selected, result };
}

function assertSummaryGrammar(summary: string, selected: ReturnType<typeof buildValidatedSummary>["selected"]) {
  assert.equal(hasUnreadySummaryFragments(summary), false);
  assert.equal(hasAwkwardSummaryConcatenation(summary), false);
  assert.doesNotMatch(summary, /met en évidence centralité\b/i);
  assert.doesNotMatch(summary, /liés à taux\b/i);
  assert.doesNotMatch(summary, /\bincivilités\b/i);
  assert.doesNotMatch(summary, /\bstructure\(s\)/i);
  assert.doesNotMatch(summary, /\brecensée\(s\)/i);
  assert.doesNotMatch(summary, /recul de population de\s+-/i);
  assert.doesNotMatch(summary, /logements (?:raccordables|éligibles) à la fibre/i);

  const issuePhrases = selected
    .filter((fact) => fact.target === "watchPoints" && hasSummaryIssuePhrase(fact))
    .map((fact) => fact.summaryIssuePhrase!)
    .filter((phrase) => summary.includes(phrase));

  if (issuePhrases.length > 0) {
    assert.equal(issuePhrasesAreGrammatical(issuePhrases), true);
  }
}

describe("summary multi-profils", () => {
  for (const preset of SUMMARY_PROFILES) {
    it(`${preset} — résumé avec fragments rédigés`, () => {
      const { territory, selected, result } = buildValidatedSummary(preset);
      const demography = extractDemographySnapshot(territory, selected);

      assert.match(result.summary, /Le portrait met en évidence/i);
      assertSummaryGrammar(result.summary, selected);
      assert.equal(summaryMislabelsGrowthAsDecline(result.summary, demography), false);
      assert.equal(summaryMentionsAbsentSources(result.summary, territory), false);
    });
  }

  it("demographicGrowth — croissance formulée comme contexte", () => {
    const { result } = buildValidatedSummary("demographicGrowth");

    assert.match(result.summary, /croissance démographique de 12,4\s*%/i);
    assert.doesNotMatch(result.summary, /recul de population/i);
    assert.doesNotMatch(result.summary, /évolution de \+/i);
  });

  it("ruralSparse — recul sans signe négatif", () => {
    const { result } = buildValidatedSummary("ruralSparse");

    assert.match(result.summary, /recul de population de 8,2\s*%/i);
    assert.doesNotMatch(result.summary, /recul de population de -/i);
  });

  it("urbanDense — grande commune dense", () => {
    const { territory, result } = buildValidatedSummary("urbanDense");

    assert.match(result.summary, /85[\s\u202f]?000 habitants/i);
    assert.match(result.summary, /4[\s\u202f]?200 habitants\/km²/i);
    assert.equal(summaryMentionsAbsentSources(result.summary, territory), false);
  });

  it("withoutQpv — pas de quartiers prioritaires dans le résumé", () => {
    const { result } = buildValidatedSummary("withoutQpv");

    assert.doesNotMatch(result.summary, /quartiers? prioritaires?/i);
  });

  it("withArcep — fibre sans vocabulaire logements", () => {
    const { result } = buildValidatedSummary("withArcep");

    assert.doesNotMatch(result.summary, /logements (?:raccordables|éligibles)/i);
  });

  it("sireneCapped — valeur plafonnée dans constats et limites", () => {
    const territory = createPanelProfile("sireneCapped");
    const facts = buildAnalysisFacts(territory);
    const sireneFact = facts.find(
      (fact) => fact.theme === "economy" && fact.sourceKeys.includes("sirene"),
    );

    assert.ok(sireneFact);
    assert.match(sireneFact!.sentence, /au moins 10[\s\u202f]?000 unités légales/i);

    const limits = computeDataLimits(territory);
    assert.ok(
      limits.some((limit) =>
        /≥\s*10[\s\u202f]?000|plafond API|au moins 10[\s\u202f]?000/i.test(limit),
      ),
    );
  });

  it("tous les constats retenus pour le résumé ont des fragments dédiés", () => {
    const { selected } = buildValidatedSummary("fullEnrichment");
    const assetCandidates = selected.filter(
      (fact) => fact.target === "strengths" && hasSummaryAssetPhrase(fact),
    );
    const issueCandidates = selected.filter(
      (fact) => fact.target === "watchPoints" && hasSummaryIssuePhrase(fact),
    );

    for (const fact of assetCandidates) {
      assert.match(fact.summaryAssetPhrase!, /^(?:un |une |des |la |le |les |l')/i);
    }
    for (const fact of issueCandidates) {
      assert.match(fact.summaryIssuePhrase!, /^(?:un |une |des |la |le |les |l'|certains )/i);
    }
  });

  it("Saint-Girons — recul et enjeux avec articles", () => {
    const territory = {
      ...saintGironsProfile,
      epci: { code: "200067940", name: "CC Couserans-Pyrénées" },
      densityPerKm2: 316,
    };
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(territory),
      territory,
    );
    const result = validateAnalysisOutput(
      buildCanonicalAnalysisOutput(territory, selected),
      selected,
      territory,
    );

    assert.match(result.summary, /recul de population de 5,7\s*% entre 2010 et 2022/i);
    assert.match(result.summary, /Le portrait met en évidence/i);
    if (/enjeux liés à/i.test(result.summary)) {
      assert.doesNotMatch(result.summary, /enjeux liés à taux/i);
    }
    assertSummaryGrammar(result.summary, selected);
  });
});
