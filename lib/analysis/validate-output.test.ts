import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { saintGironsProfile } from "./fixtures";
import { hasCriticalValidationIssue, validateAnalysisOutput } from "./validate-output";

describe("validateAnalysisOutput", () => {
  const analysisFacts = buildAnalysisFacts(saintGironsProfile);

  it("rejette recul démographique avec part 60+", () => {
    const result = validateAnalysisOutput(
      {
        summary: "Recul démographique marqué (-38,1 % entre 2010 et 2022).",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.summary, /-38,1\s*%/);
    assert.doesNotMatch(result.summary, /recul démographique.*38/i);
  });

  it("rejette 60 ans et plus avec taux de croissance démo", () => {
    const result = validateAnalysisOutput(
      {
        summary: "",
        strengths: ["Les 60 ans et plus représentent -5,7 % de la population."],
        watchPoints: [],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.strengths.join(" "), /-5,7\s*%/);
  });

  it("rejette absence de logements sociaux", () => {
    const result = validateAnalysisOutput(
      {
        summary: "",
        strengths: [],
        watchPoints: ["Absence de logements sociaux sur la commune."],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.watchPoints.join(" "), /absence de logements sociaux/i);
  });

  it("rejette potentiel touristique sous-exploité", () => {
    const result = validateAnalysisOutput(
      {
        summary: "",
        strengths: [],
        watchPoints: [],
        opportunities: ["Potentiel touristique sous-exploité."],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.opportunities.join(" "), /sous-exploité/i);
  });

  it("rejette prix stables sans analyse robuste", () => {
    const result = validateAnalysisOutput(
      {
        summary: "Prix moyens stables sur le marché immobilier local.",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.summary, /prix.*stables/i);
  });

  it("rejette tendance à la hausse avec une seule année", () => {
    const result = validateAnalysisOutput(
      {
        summary: "",
        strengths: [],
        watchPoints: ["Tendance à la hausse des faits enregistrés."],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.watchPoints.join(" "), /tendance à la hausse/i);
  });

  it("rejette chef-lieu de l'EPCI", () => {
    const result = validateAnalysisOutput(
      {
        summary: "Saint-Girons, chef-lieu de l'EPCI.",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.summary, /chef-lieu de l'EPCI/i);
  });

  it("rejette fuites de règles internes", () => {
    const result = validateAnalysisOutput(
      {
        summary: "Analyse à décrire sans comparaison homogène.",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.summary, /sans comparaison/i);
    assert.doesNotMatch(result.summary, /numericBindings/i);
  });

  it("rejette fusion SIDE + FLORES", () => {
    assert.ok(
      hasCriticalValidationIssue(
        "658 unités légales SIDE et 4 200 postes salariés FLORES dans le même tissu.",
        analysisFacts,
      ),
    );
  });

  it("rejette fracture numérique depuis seule part ARCEP", () => {
    const result = validateAnalysisOutput(
      {
        summary: "",
        strengths: [],
        watchPoints: ["Fracture numérique importante malgré 72,5 % de fibre."],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.watchPoints.join(" "), /fracture numérique/i);
  });

  it("rejette desserte médicale depuis seul FINESS", () => {
    const result = validateAnalysisOutput(
      {
        summary: "",
        strengths: [],
        watchPoints: ["Desserte médicale insuffisante selon FINESS."],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.watchPoints.join(" "), /desserte/i);
  });

  it("rejette dynamisme sectoriel FLORES", () => {
    const result = validateAnalysisOutput(
      {
        summary: "",
        strengths: ["Dynamisme sectoriel marqué selon FLORES."],
        watchPoints: [],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.strengths.join(" "), /dynamisme sectoriel/i);
  });

  it("rejette un pourcentage absent des faits (hallucination)", () => {
    const result = validateAnalysisOutput(
      {
        summary: "",
        strengths: [],
        watchPoints: ["Le taux de chômage atteint 25,0 % au recensement 2021."],
        opportunities: [],
      },
      analysisFacts,
    );

    assert.doesNotMatch(result.watchPoints.join(" "), /25,0\s*%/);
  });

  it("conserve une sortie valide structurée", () => {
    const result = validateAnalysisOutput(
      {
        summary:
          "La population légale s'élève à 6 008 habitants en 2022. La population recule de -5,7 % entre 2010 et 2022.",
        strengths: [
          "Le tissu économique local est décrit par 658 unités légales et 749 établissements actifs selon SIDE INSEE 2022.",
        ],
        watchPoints: [
          "Les 60 ans et plus représentent 38,1 % de la population en 2021.",
        ],
        opportunities: ["Potentiel touristique à approfondir, faute de données de fréquentation."],
      },
      analysisFacts,
    );

    assert.ok(result.summary.length > 0);
    assert.ok(result.strengths.length > 0);
    assert.ok(result.watchPoints.length > 0);
    assert.ok(result.opportunities.length > 0);
  });
});
