import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RGE_MIN_SIGNIFICANT_COUNT } from "./opportunities";
import {
  AGEING_WATCH_POINT_PATTERN,
  ANALYSIS_OUTPUT_LIMITS,
  buildFinalTerritorialAnalysis,
  countSecurityIndicatorsAboveDepartment,
  ESS_RGE_OPPORTUNITY_PATTERN,
  GLOBAL_SECURITY_FORMULATION,
  RGE_OPPORTUNITY_PATTERN,
  summaryThemesMissingFromSelectedFacts,
  TOURISM_PER_CAPITA_RATIO_PATTERN,
  TOURISM_RATIO_PRUDENCE_PATTERN,
  tourismAccommodationRatio,
} from "./evaluation-helpers";
import { chamonixProfile, palaiseauProfile } from "./reference-communes";

describe("évaluation métier — communes de référence", () => {
  describe("invariants communs (Palaiseau + Chamonix)", () => {
    for (const [label, profile] of [
      ["Palaiseau", palaiseauProfile],
      ["Chamonix", chamonixProfile],
    ] as const) {
      it(`${label} — au plus ${ANALYSIS_OUTPUT_LIMITS.opportunities.max} opportunités en sortie finale`, () => {
        const { analysis } = buildFinalTerritorialAnalysis(profile);

        assert.ok(
          analysis.opportunities.length <= ANALYSIS_OUTPUT_LIMITS.opportunities.max,
          `Attendu ≤ ${ANALYSIS_OUTPUT_LIMITS.opportunities.max}, obtenu ${analysis.opportunities.length} : ${JSON.stringify(analysis.opportunities)}`,
        );
      });

      it(`${label} — aucun thème cité dans le summary sans couverture par selectedFacts`, () => {
        const { selectedFacts, analysis } = buildFinalTerritorialAnalysis(profile);
        const missing = summaryThemesMissingFromSelectedFacts(
          analysis.summary,
          selectedFacts,
        );

        assert.deepEqual(
          missing,
          [],
          `Thèmes cités dans le summary sans fait sélectionné couvrant : ${missing.join(", ")}`,
        );
      });
    }
  });

  describe("Palaiseau (91477)", () => {
    it("ne produit pas une formulation sécurité globale si un seul indicateur dépasse la référence départementale", () => {
      const aboveDept = countSecurityIndicatorsAboveDepartment(palaiseauProfile);
      assert.equal(
        aboveDept,
        1,
        "Précondition fixture : un seul indicateur SSMSI au-dessus du département (cambriolages).",
      );

      const { analysis } = buildFinalTerritorialAnalysis(palaiseauProfile);
      const securityTexts = [
        analysis.summary,
        ...analysis.watchPoints,
        ...analysis.strengths,
      ].join("\n");

      assert.doesNotMatch(
        securityTexts,
        GLOBAL_SECURITY_FORMULATION,
        "Avec un seul indicateur au-dessus de la référence, éviter une généralisation plurielle (« certains indicateurs… »).",
      );
    });

    it("ne produit pas de watchPoint vieillissement sans benchmark", () => {
      const { selectedFacts, analysis } = buildFinalTerritorialAnalysis(palaiseauProfile);

      const ageingSelected = selectedFacts.filter((fact) => fact.theme === "ageing");
      const ageingWatchPoints = analysis.watchPoints.filter((item) =>
        AGEING_WATCH_POINT_PATTERN.test(item),
      );

      assert.equal(
        ageingWatchPoints.length,
        0,
        `Watch points vieillissement interdits sans benchmark : ${JSON.stringify(ageingWatchPoints)}`,
      );

      for (const fact of ageingSelected) {
        assert.notEqual(
          fact.target,
          "watchPoints",
          "Le fait vieillissement ne doit pas être ciblé watchPoints sans signal robuste.",
        );
      }
    });
  });

  describe("Chamonix-Mont-Blanc (74056)", () => {
    it("ajoute une prudence sur les ratios par habitant liés au tourisme", () => {
      const ratio = tourismAccommodationRatio(chamonixProfile);
      assert.ok(
        ratio !== null && ratio >= 0.4,
        `Précondition fixture : commune très touristique (ratio places/population ≈ ${ratio?.toFixed(2)}).`,
      );

      const { facts, analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
      const tourismTexts = [
        analysis.summary,
        ...analysis.strengths,
        ...analysis.watchPoints,
        ...analysis.opportunities,
        ...facts
          .filter((fact) => fact.theme === "tourism")
          .map((fact) => fact.sentence),
      ].join("\n");

      const ratioMentions = tourismTexts.match(TOURISM_PER_CAPITA_RATIO_PATTERN) ?? [];

      if (ratioMentions.length === 0) {
        // Comportement attendu documenté : dès qu'un ratio tourisme/habitant est exprimé,
        // une mention de prudence (fréquentation absente, population résidente, etc.) doit l'accompagner.
        const places = chamonixProfile.enrichment?.tourism?.accommodationPlaces ?? 0;
        const population = chamonixProfile.population ?? 0;
        const impliedRatio = population > 0 ? places / population : 0;

        assert.ok(
          impliedRatio >= 0.4,
          `Ratio implicite élevé (${impliedRatio.toFixed(2)} places/hab) : la prudence tourisme devrait figurer dans le portrait (forces, limites ou opportunités).`,
        );

        const prudenceSomewhere = tourismTexts.match(TOURISM_RATIO_PRUDENCE_PATTERN);
        assert.ok(
          prudenceSomewhere,
          "Attendu : mention explicite de prudence liée au tourisme (fréquentation absente, population résidente, etc.).",
        );
        return;
      }

      for (const mention of ratioMentions) {
        const contextWindow = tourismTexts.slice(
          Math.max(0, tourismTexts.indexOf(mention) - 120),
          tourismTexts.indexOf(mention) + mention.length + 120,
        );
        assert.match(
          contextWindow,
          TOURISM_RATIO_PRUDENCE_PATTERN,
          `Ratio tourisme/habitant sans prudence : « ${mention} »`,
        );
      }
    });

    it("ne qualifie pas la dette uniquement par dette/habitant si les recettes sont disponibles", () => {
      const accounts = chamonixProfile.enrichment?.publicAccounts;
      assert.ok(accounts?.available);
      assert.ok(accounts.debtPerCapitaEur != null);
      assert.ok(
        accounts.operatingRevenuePerCapitaEur != null ||
          accounts.operatingRevenueEur != null,
        "Précondition fixture : recettes OFGL disponibles.",
      );

      const { analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
      const debtTexts = [
        analysis.summary,
        ...analysis.watchPoints,
        ...analysis.strengths,
      ].filter((text) => /\bdette\b/i.test(text));

      assert.ok(debtTexts.length > 0, "Précondition : un constat dette est produit pour Chamonix.");

      const revenueContextPattern =
        /\b(?:recettes|rapport|charge de la dette|annuité de la dette|endettement.*recettes|recettes.*endettement)\b/i;

      for (const text of debtTexts) {
        assert.match(
          text,
          revenueContextPattern,
          `Constat dette sans mise en perspective des recettes : « ${text} »`,
        );
      }
    });

    it("formulation plurielle si plusieurs indicateurs SSMSI dépassent la référence", () => {
      const aboveCount = countSecurityIndicatorsAboveDepartment(chamonixProfile);

      assert.ok(
        aboveCount >= 2,
        `Précondition fixture : au moins deux indicateurs SSMSI au-dessus de la référence (obtenu ${aboveCount}).`,
      );

      const { facts, analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
      const securityFact = facts.find((fact) => fact.theme === "security");

      assert.ok(securityFact);
      assert.match(
        securityFact!.sentence,
        /Plusieurs indicateurs|Certains indicateurs/,
      );
      assert.doesNotMatch(securityFact!.sentence, /^Un indicateur de sécurité —/);

      const securityTexts = [
        analysis.summary,
        ...analysis.watchPoints,
        ...analysis.strengths,
      ].join("\n");
      assert.match(securityTexts, /Plusieurs indicateurs|Certains indicateurs/);
    });

    it("ne privilégie pas une opportunité RGE si le nombre RGE est très faible", () => {
      const rgeCount = chamonixProfile.enrichment?.enterprises?.rgeCount ?? 0;
      assert.ok(
        rgeCount < RGE_MIN_SIGNIFICANT_COUNT,
        `Précondition fixture : RGE faible (${rgeCount} < ${RGE_MIN_SIGNIFICANT_COUNT}).`,
      );

      const { analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
      const rgeOpportunities = analysis.opportunities.filter((item) =>
        RGE_OPPORTUNITY_PATTERN.test(item),
      );

      assert.equal(
        rgeOpportunities.length,
        0,
        `Opportunité RGE non pertinente avec ${rgeCount} structure(s) : ${JSON.stringify(rgeOpportunities)}`,
      );

      const essRgeGeneric = analysis.opportunities.filter((item) =>
        ESS_RGE_OPPORTUNITY_PATTERN.test(item),
      );
      assert.equal(
        essRgeGeneric.length,
        0,
        `Opportunité ESS/RGE générique à éviter avec volume RGE faible : ${JSON.stringify(essRgeGeneric)}`,
      );
    });
  });
});
