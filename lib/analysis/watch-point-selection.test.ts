import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { buildFinalTerritorialAnalysis } from "./evaluation-helpers";
import { angersProfile, chamonixProfile, rennesProfile } from "./reference-communes";
import { ANALYSIS_OUTPUT_LIMITS } from "./prompt-limits";
import {
  isRadonRiskWatchFact,
  resolveRiskWatchSubtype,
} from "./risk-watch-subtypes";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import { isFactEligibleForWatchPoint } from "./qualify-facts";
import { QPV_WATCH_POINT_MIN_COUNT } from "./watch-point-selection-gates";

function watchPointsFor(profile: typeof angersProfile) {
  const facts = buildAnalysisFacts(profile);
  const selected = selectAnalysisFactsForPrompt(facts, profile);
  return selected.filter((fact) => fact.target === "watchPoints");
}

describe("risk-watch-subtypes", () => {
  it("identifie inondation, CATNAT et radon", () => {
    const facts = buildAnalysisFacts(angersProfile);
    const risks = facts.filter((fact) => fact.theme === "risks");

    const flood = risks.find((fact) => resolveRiskWatchSubtype(fact) === "flood");
    const catnat = risks.find((fact) => resolveRiskWatchSubtype(fact) === "catnat");
    const radon = risks.find((fact) => resolveRiskWatchSubtype(fact) === "radon");

    assert.ok(flood);
    assert.ok(catnat);
    assert.ok(radon);
    assert.equal(isRadonRiskWatchFact(radon!), true);
  });
});

describe("watch-point-selection — règles générales", () => {
  it("Angers — un seul risque retenu, inondation plutôt que CATNAT, radon exclu", () => {
    const watchPoints = watchPointsFor(angersProfile);
    const riskFacts = watchPoints.filter((fact) => fact.theme === "risks");

    assert.equal(riskFacts.length, 1);
    assert.match(riskFacts[0]!.sentence, /zones à risque d'inondation/i);
    assert.ok(!watchPoints.some((fact) => /radon/i.test(fact.sentence)));
  });

  it("Angers — QPV ≥ 3 éligible et retenu avec bonus commune dense", () => {
    const watchPoints = watchPointsFor(angersProfile);
    const qpv = watchPoints.find((fact) => fact.theme === "policy_city");

    assert.ok(qpv, "QPV attendu dans les watchPoints pour Angers (8 quartiers, commune dense)");
    assert.match(qpv!.sentence, /8 quartiers prioritaires/i);
  });

  it("Angers — résumé éditorial : max 3 enjeux issus des watchPoints sélectionnés", () => {
    const { analysis } = buildFinalTerritorialAnalysis(angersProfile);
    const summary = analysis.editorial?.summary ?? analysis.summary;

    assert.ok(/chômage|sécurité|quartiers|inondation/i.test(summary));
    assert.ok(!/radon/i.test(summary));
  });

  it("filtre QPV < 3 à l'éligibilité", () => {
    const profile = {
      ...rennesProfile,
      enrichment: {
        ...rennesProfile.enrichment!,
        urbanPolicy: {
          ...rennesProfile.enrichment!.urbanPolicy!,
          qpvCount: 2,
          hasQpv: true,
        },
      },
    };

    const facts = buildAnalysisFacts(profile);
    const qpvFact = facts.find((fact) => fact.theme === "policy_city");
    assert.ok(qpvFact);

    assert.equal(
      isFactEligibleForWatchPoint(qpvFact!, { territory: profile }),
      false,
    );
  });

  it("respecte la limite de 5 watchPoints sur les golden communes", () => {
    for (const profile of [angersProfile, rennesProfile, chamonixProfile]) {
      const watchPoints = watchPointsFor(profile);
      assert.ok(watchPoints.length <= ANALYSIS_OUTPUT_LIMITS.watchPoints.max);
    }
  });

  it("expose le seuil QPV documenté", () => {
    assert.equal(QPV_WATCH_POINT_MIN_COUNT, 3);
  });
});

describe("buildRiskFacts — un fait CATNAT par label", () => {
  it("Angers — sécheresse et inondations CATNAT distincts en construction", () => {
    const facts = buildAnalysisFacts(angersProfile).filter((fact) => fact.theme === "risks");
    const catnatFacts = facts.filter((fact) => /catastrophe naturelle/i.test(fact.sentence));

    assert.ok(catnatFacts.length >= 2);
    assert.ok(catnatFacts.some((fact) => /sécheresse/i.test(fact.sentence)));
    assert.ok(
      catnatFacts.some((fact) => /inondations et\/ou coulées de boue/i.test(fact.sentence)),
    );
  });
});
