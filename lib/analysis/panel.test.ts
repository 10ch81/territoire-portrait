import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import {
  createPanelProfile,
  ruralProfileMinimal,
  saintGironsProfile,
  type PanelPreset,
} from "./fixtures";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import { hasDuplicateIndicatorInTarget } from "./dedupe-facts";
import { isActionableOpportunity, isStudyOnlyFact } from "./score-facts";
import { hasCriticalValidationIssue, validateAnalysisOutput } from "./validate-output";

const PANEL_PRESETS: PanelPreset[] = [
  "ruralSparse",
  "urbanDense",
  "periurban",
  "tourist",
  "coastal",
  "mountain",
  "coastalOrMountain",
  "industrial",
  "residential",
  "withQpv",
  "withoutQpv",
  "lowSsmsi",
  "lowDvf",
  "sideSireneDivergence",
  "withFlores",
  "withFiness",
  "withEducation",
  "withArcep",
  "fullEnrichment",
];

function assertNoForbiddenPhrases(text: string): void {
  assert.equal(hasCriticalValidationIssue(text, buildAnalysisFacts(saintGironsProfile)), false);
}

describe("panel multi-profils", () => {
  for (const preset of PANEL_PRESETS) {
    it(`${preset} — builders sans confusion thématique critique`, () => {
      const profile = createPanelProfile(preset);
      const facts = buildAnalysisFacts(profile);
      const allText = facts.map((f) => f.sentence).join(" ");

      assert.doesNotMatch(allText, /absence de logements sociaux/i);
      assert.doesNotMatch(allText, /tissu économique dynamique/i);
      assert.doesNotMatch(allText, /sous-exploité/i);

      const demography = facts.find((f) => f.theme === "demography");
      const ageing = facts.find((f) => f.theme === "ageing");
      if (demography && ageing) {
        const growthBinding = demography.numericBindings?.find((b) =>
          b.label.includes("évolution"),
        );
        if (growthBinding && typeof growthBinding.value === "number") {
          assert.doesNotMatch(ageing.sentence, new RegExp(String(growthBinding.value)));
        }
      }

      const side = facts.find((f) => f.theme === "economy");
      const flores = facts.find((f) => f.theme === "employment_sectors");
      if (side && flores) {
        assert.doesNotMatch(side.sentence, /postes salariés|FLORES/i);
        assert.doesNotMatch(flores.sentence, /unités légales|SIDE/i);
      }

      const security = facts.find((f) => f.theme === "security");
      const risks = facts.find((f) => f.theme === "risks");
      if (security && risks) {
        assert.doesNotMatch(security.sentence, /CATNAT|Géorisques/i);
        assert.doesNotMatch(risks.sentence, /SSMSI/i);
      }
    });
  }

  it("urbanDense — QPV formulé comme enjeu localisé", () => {
    const facts = buildAnalysisFacts(createPanelProfile("urbanDense"));
    const qpv = facts.find((f) => f.theme === "policy_city");
    assert.ok(qpv);
    assert.match(qpv!.sentence, /localisés|quartier/i);
    assert.doesNotMatch(qpv!.sentence, /toute la commune/i);
  });

  it("lowSsmsi — pas de comparaison département si taux inférieur", () => {
    const facts = buildAnalysisFacts(createPanelProfile("lowSsmsi"));
    const security = facts.find((f) => f.theme === "security");
    assert.ok(security);
    assert.doesNotMatch(security!.sentence, /supérieurs aux références départementales/i);
  });

  it("sideSireneDivergence — constat d'écart méthodologique", () => {
    const facts = buildAnalysisFacts(createPanelProfile("sideSireneDivergence"));
    const warning = facts.find(
      (f) => f.theme === "economy" && f.confidence === "low",
    );
    assert.ok(warning);
    assert.match(warning!.sentence, /SIDE|SIRENE|Écart/i);
  });

  it("tourist — opportunités actionnables sans study-only", () => {
    const profile = createPanelProfile("tourist");
    const facts = buildAnalysisFacts(profile);
    const opportunities = facts.filter((f) => f.target === "opportunities");

    assert.ok(opportunities.length >= 1);
    for (const opp of opportunities) {
      assert.equal(isStudyOnlyFact(opp), false);
      assert.equal(isActionableOpportunity(opp), true);
    }
  });

  it("sélection — couverture thématique, déduplication et volume raisonnable", () => {
    const profile = createPanelProfile("fullEnrichment");
    const all = buildAnalysisFacts(profile);
    const selected = selectAnalysisFactsForPrompt(all, profile);

    assert.ok(selected.length <= 22);
    assert.ok(selected.length >= 4);

    const themes = new Set(selected.map((f) => f.theme));
    assert.ok(
      themes.has("identity") ||
        themes.has("demography") ||
        themes.has("centrality"),
    );

    for (const target of ["watchPoints", "opportunities"] as const) {
      assert.equal(hasDuplicateIndicatorInTarget(selected, target), false);
    }

    const opps = selected.filter((f) => f.target === "opportunities");
    for (const opp of opps) {
      assert.equal(isStudyOnlyFact(opp), false);
    }
  });

  it("industrial — FLORES remonte dans les forces", () => {
    const profile = createPanelProfile("industrial");
    const selected = selectAnalysisFactsForPrompt(buildAnalysisFacts(profile), profile);
    assert.ok(selected.some((f) => f.theme === "employment_sectors"));
  });

  it("withArcep — connectivité remonte dans les forces", () => {
    const profile = createPanelProfile("withArcep");
    const selected = selectAnalysisFactsForPrompt(buildAnalysisFacts(profile), profile);
    assert.ok(selected.some((f) => f.theme === "connectivity"));
  });

  it("validation — rejette formulations interdites sur panel", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const result = validateAnalysisOutput(
      {
        summary: "Un tissu économique dynamique structure la commune.",
        strengths: ["Vitalité économique marquée."],
        watchPoints: ["Tendance à la hausse des prix."],
        opportunities: ["Faire une analyse plus poussée du territoire."],
      },
      facts,
    );

    assert.doesNotMatch(result.summary, /dynamique/i);
    assert.doesNotMatch(result.strengths.join(" "), /vitalité/i);
    assert.doesNotMatch(result.watchPoints.join(" "), /tendance à la hausse/i);
    assert.equal(
      result.opportunities.some((o) => /faire une analyse/i.test(o)),
      false,
    );
  });

  it("commune minimale — identité uniquement", () => {
    const facts = buildAnalysisFacts(ruralProfileMinimal);
    assert.ok(facts.some((f) => f.theme === "identity"));
    assert.equal(facts.some((f) => f.theme === "demography"), false);
  });
});

describe("panel — opportunités vacance", () => {
  it("Saint-Girons — opportunité réhabilitation parc vacant", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const rehab = facts.find(
      (f) =>
        f.target === "opportunities" &&
        f.sentence.includes("Réhabiliter"),
    );
    assert.ok(rehab);
    assertNoForbiddenPhrases(rehab!.sentence);
  });
});
