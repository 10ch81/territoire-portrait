import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFinalTerritorialAnalysis } from "./evaluation-helpers";
import { ANALYSIS_OUTPUT_LIMITS } from "./prompt-limits";
import { buildTerritoryContext } from "./context/buildTerritoryContext";
import { resolveDisplayTypologyLabel } from "./context/displayTypologyLabel";
import { tourismAccommodationRatio } from "./context/buildTerritoryContext";
import { STRONG_TOURISM_CAPACITY_PER_RESIDENT } from "./context/tourism-classification";
import {
  bousseLikeProfile,
  rennesLikeProfile,
} from "./contextual-reference-profiles";
import { chamonixProfile, palaiseauProfile } from "./reference-communes";

const TOURISM_OPPORTUNITY_PATTERN =
  /articuler capacité d'hébergement|accueil touristique local/i;
const MECHANICAL_PRUDENCE_SUFFIX = / — Interprétation prudente/i;
const ESS_RGE_LEVER_PATTERN = /\b(?:ESS|RGE)\b/i;

function collectOutputText(analysis: ReturnType<typeof buildFinalTerritorialAnalysis>["analysis"]): string {
  return [
    analysis.summary,
    ...analysis.strengths,
    ...analysis.watchPoints,
    ...analysis.opportunities,
  ].join("\n");
}

function assertCleanPunctuation(text: string): void {
  assert.doesNotMatch(text, /\)\.,/);
  assert.doesNotMatch(text, /\.\./);
  assert.doesNotMatch(text, MECHANICAL_PRUDENCE_SUFFIX);
}

describe("anti-régression — profils de référence", () => {
  describe("Rennes-like (35238)", () => {
    const { analysis } = buildFinalTerritorialAnalysis(rennesLikeProfile);
    const context = buildTerritoryContext(rennesLikeProfile);
    const ratio = tourismAccommodationRatio(rennesLikeProfile);

    it("n'est pas classée touristique", () => {
      assert.equal(context.isTouristCommune, false);
      assert.ok(ratio != null && ratio < STRONG_TOURISM_CAPACITY_PER_RESIDENT);
    });

    it("summary sans montagne ni vocation touristique", () => {
      assert.doesNotMatch(analysis.summary, /montagne/i);
      assert.doesNotMatch(analysis.summary, /vocation touristique/i);
      assert.doesNotMatch(analysis.summary, /centralité touristique/i);
    });

    it("pas d'opportunité tourisme ni prudence suffixée", () => {
      assert.ok(!analysis.opportunities.some((item) => TOURISM_OPPORTUNITY_PATTERN.test(item)));
      assertCleanPunctuation(collectOutputText(analysis));
    });

    it("pas de fibre générique ni France Services en point fort", () => {
      const { selectedFacts } = buildFinalTerritorialAnalysis(rennesLikeProfile);
      const strengths = selectedFacts.filter((f) => f.target === "strengths");
      assert.ok(!strengths.some((f) => f.theme === "public_services"));
      assert.ok(
        !strengths.some(
          (f) => f.theme === "connectivity" && /fibre|raccordables/i.test(f.sentence),
        ),
      );
    });
  });

  describe("Palaiseau (91477)", () => {
    const { analysis } = buildFinalTerritorialAnalysis(palaiseauProfile);
    const context = buildTerritoryContext(palaiseauProfile);

    it("n'est pas classée touristique", () => {
      assert.equal(context.isTouristCommune, false);
    });

    it("summary sans centralité touristique ni montagne", () => {
      assert.doesNotMatch(analysis.summary, /centralité touristique/i);
      assert.doesNotMatch(analysis.summary, /montagne/i);
      const label = resolveDisplayTypologyLabel(palaiseauProfile);
      assert.doesNotMatch(label ?? "", /centralité touristique/i);
    });

    it("pas d'opportunité tourisme", () => {
      assert.ok(!analysis.opportunities.some((item) => TOURISM_OPPORTUNITY_PATTERN.test(item)));
    });

    it("points forts sans prudence tourisme suffixée", () => {
      for (const strength of analysis.strengths) {
        assert.doesNotMatch(strength, /fréquentation touristique absente/i);
        assert.doesNotMatch(strength, MECHANICAL_PRUDENCE_SUFFIX);
      }
    });

    it("sécurité formulée au singulier", () => {
      const securityTexts = [analysis.summary, ...analysis.watchPoints].join("\n");
      assert.match(securityTexts, /Un indicateur de sécurité|un indicateur de sécurité/i);
      assert.doesNotMatch(securityTexts, /certains indicateurs de sécurité/i);
    });
  });

  describe("Bousse-like (57190)", () => {
    const { analysis, selectedFacts } = buildFinalTerritorialAnalysis(bousseLikeProfile);

    it("points forts sans prudence petite commune suffixée", () => {
      for (const strength of analysis.strengths) {
        assert.doesNotMatch(strength, /commune de petite taille/i);
        assert.doesNotMatch(strength, MECHANICAL_PRUDENCE_SUFFIX);
      }
      const strengthFacts = selectedFacts.filter((f) => f.target === "strengths");
      for (const fact of strengthFacts) {
        assert.doesNotMatch(fact.sentence, MECHANICAL_PRUDENCE_SUFFIX);
      }
    });

    it("prudence sécurité intégrée sans ponctuation cassée", () => {
      const securityWatch = analysis.watchPoints.find((item) => /sécurité|SSMSI/i.test(item));
      assert.ok(securityWatch);
      assert.doesNotMatch(securityWatch!, /\)\.,/);
      assert.match(
        securityWatch!,
        /faible volume de faits|diffusion partielle/i,
      );
    });

    it("opportunités limitées et sortie propre", () => {
      assert.ok(analysis.opportunities.length <= ANALYSIS_OUTPUT_LIMITS.opportunities.max);
      assertCleanPunctuation(collectOutputText(analysis));
    });
  });

  describe("Chamonix (74056)", () => {
    const { analysis, selectedFacts } = buildFinalTerritorialAnalysis(chamonixProfile);
    const context = buildTerritoryContext(chamonixProfile);

    it("reste touristique de montagne", () => {
      assert.equal(context.isTouristCommune, true);
      assert.match(analysis.summary, /montagne|touristique|centralit/i);
      const label = resolveDisplayTypologyLabel(chamonixProfile);
      assert.match(label ?? analysis.summary, /montagne|touristique/i);
    });

    it("opportunité tourisme autorisée", () => {
      const hasTourismOpp = analysis.opportunities.some((item) =>
        TOURISM_OPPORTUNITY_PATTERN.test(item),
      );
      assert.ok(hasTourismOpp || selectedFacts.some((f) => f.theme === "tourism" && f.target === "opportunities"));
    });

    it("pas de levier ESS/RGE prioritaire avec RGE faible", () => {
      const rgeCount = chamonixProfile.enrichment?.enterprises?.rgeCount ?? 0;
      assert.ok(rgeCount < 10);
      assert.ok(!analysis.strengths.some((item) => ESS_RGE_LEVER_PATTERN.test(item)));
      assert.ok(!analysis.opportunities.some((item) => /mobiliser les acteurs ess et rge/i.test(item)));
    });

    it("dette contextualisée avec recettes", () => {
      const debtTexts = [analysis.summary, ...analysis.watchPoints, ...selectedFacts.map((f) => f.sentence)].join("\n");
      assert.match(debtTexts, /recettes de fonctionnement|recettes/i);
      assert.ok(
        !selectedFacts.some(
          (f) =>
            f.theme === "finances" &&
            f.target === "watchPoints" &&
            /€ par habitant/i.test(f.sentence) &&
            !/recettes/i.test(f.sentence),
        ),
      );
    });

    it("sortie sans suffixes mécaniques ni ponctuation cassée", () => {
      assertCleanPunctuation(collectOutputText(analysis));
    });
  });

  describe("invariants globaux", () => {
    for (const [label, profile] of [
      ["Rennes-like", rennesLikeProfile],
      ["Palaiseau", palaiseauProfile],
      ["Bousse-like", bousseLikeProfile],
      ["Chamonix", chamonixProfile],
    ] as const) {
      it(`${label} — plafonds et ponctuation`, () => {
        const { analysis } = buildFinalTerritorialAnalysis(profile);
        assert.ok(analysis.strengths.length <= ANALYSIS_OUTPUT_LIMITS.strengths.max);
        assert.ok(analysis.watchPoints.length <= ANALYSIS_OUTPUT_LIMITS.watchPoints.max);
        assert.ok(analysis.opportunities.length <= ANALYSIS_OUTPUT_LIMITS.opportunities.max);
        assertCleanPunctuation(collectOutputText(analysis));
      });
    }
  });
});
