import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMMUNE_FIXTURES,
  fragileAnalysisForFixture,
} from "./mistral-sanitize.fixtures";
import {
  containsForbiddenPhrases,
  sanitizeTerritorialAnalysis,
} from "./mistral-sanitize";

function collectText(analysis: {
  summary: string;
  strengths: string[];
  watchPoints: string[];
  opportunities: string[];
}): string {
  return [
    analysis.summary,
    ...analysis.strengths,
    ...analysis.watchPoints,
    ...analysis.opportunities,
  ].join("\n");
}

describe("sanitizeTerritorialAnalysis", () => {
  for (const fixture of COMMUNE_FIXTURES) {
    it(`nettoie les formulations fragiles — ${fixture.label}`, () => {
      const raw = fragileAnalysisForFixture(fixture.id);
      const { analysis, warnings } = sanitizeTerritorialAnalysis(raw, fixture.facts);
      const text = collectText(analysis);

      assert.ok(warnings.length > 0, "des avertissements de sanitisation sont attendus");
      assert.equal(text.includes("chef-lieu de l'EPCI"), false);
      assert.equal(text.includes("chef-lieu de l’EPCI"), false);
      assert.equal(text.toLowerCase().includes("vitalité économique marquée"), false);
      assert.equal(text.toLowerCase().includes("dynamique entrepreneuriale marquée"), false);
      assert.equal(text.toLowerCase().includes("potentiel touristique sous-exploité"), false);
      assert.equal(text.toLowerCase().includes("tensions sociales"), false);
      assert.equal(text.toLowerCase().includes("insécurité croissante"), false);
      assert.equal(text.toLowerCase().includes("pression fiscale faible"), false);
      assert.equal(text.toLowerCase().includes("pression fiscale forte"), false);
      assert.equal(text.toLowerCase().includes("offre de transport limitée"), false);
      assert.equal(text.toLowerCase().includes("accessibilité immobilière"), false);
      assert.equal(text.toLowerCase().includes("moyenne nationale"), false);
      assert.equal(text.toLowerCase().includes("dynamique immobilière soutenue"), false);
      assert.equal(text.toLowerCase().includes("résilience des volumes"), false);
      assert.equal(text.toLowerCase().includes("prix moyens stables"), false);
      assert.equal(text.toLowerCase().includes("marché immobilier actif"), false);
      assert.equal(text.toLowerCase().includes("tissu entrepreneurial local"), false);
      assert.equal(text.toLowerCase().includes("accessibilité aux infrastructures"), false);
      assert.equal(text.toLowerCase().includes("faible dépendance aux transports en commun"), false);
      assert.equal(text.toLowerCase().includes("complémentarité entre side"), false);
      assert.equal(text.toLowerCase().includes("fonction centrale économique et administrative"), false);
      if (fixture.facts.geographie.aireAttraction) {
        assert.equal(text.toLowerCase().includes("aire urbaine"), false);
      }
      assert.equal(text.toLowerCase().includes("supérieur aux indicateurs départementaux"), false);
      assert.equal(text.toLowerCase().includes("enjeux sécuritaires"), false);
      assert.equal(text.toLowerCase().includes("offre de transport collectif limitée"), false);
      assert.equal(text.toLowerCase().includes("acteurs mobilisables"), false);
      assert.equal(text.toLowerCase().includes("agences immobilières locales"), false);
      assert.equal(text.toLowerCase().includes("équipements, dont commerces"), false);
      if (fixture.facts.mobilite?.domicileTravail) {
        assert.equal(
          text.toLowerCase().includes("actifs travaillant hors de la commune"),
          false,
        );
      }
      assert.equal(typeof analysis.summary, "string");
      assert.ok(analysis.summary.length > 0);
      assert.ok(Array.isArray(analysis.strengths));
      assert.ok(Array.isArray(analysis.watchPoints));
      assert.ok(Array.isArray(analysis.opportunities));
    });
  }

  it("remplace chef-lieu de l'EPCI par commune-centre de l'EPCI", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "Chef-lieu de l'EPCI au cœur du territoire.",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      COMMUNE_FIXTURES[0].facts,
    );

    assert.match(analysis.summary, /commune-centre de l'EPCI/i);
  });

  it("bloque la comparaison au chômage national sans benchmark fourni", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "Le taux de chômage est inférieur au taux national.",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      COMMUNE_FIXTURES[0].facts,
    );

    assert.equal(analysis.summary.toLowerCase().includes("au taux national"), false);
    assert.match(analysis.summary, /sans comparaison nationale homogène/i);
  });

  it("remplace la tendance si une seule année est disponible", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "Tendance à la hausse observée sur les indicateurs.",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      COMMUNE_FIXTURES.find((fixture) => fixture.id === "partial-ssmsi")!.facts,
    );

    assert.equal(analysis.summary.toLowerCase().includes("tendance à la hausse"), false);
    assert.match(analysis.summary, /constat ponctuel/i);
  });

  it("adoucit les formulations DVF sans analyse robuste", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "Marché stable avec dynamique immobilière soutenue.",
        strengths: ["Résilience des volumes de mutations."],
        watchPoints: [],
        opportunities: [],
      },
      COMMUNE_FIXTURES.find((fixture) => fixture.id === "touristic")!.facts,
    );

    const text = collectText(analysis);
    assert.equal(text.toLowerCase().includes("dynamique immobilière soutenue"), false);
    assert.equal(text.toLowerCase().includes("résilience des volumes"), false);
    assert.equal(text.toLowerCase().includes("prix moyens stables"), false);
    assert.match(text, /mutations recensées|données DVF agrégées|volume de mutations recensé/i);
  });

  it("remplace prix moyens stables sans analyse temporelle robuste", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "Prix moyens stables sur le marché local.",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      COMMUNE_FIXTURES.find((fixture) => fixture.id === "saint-girons")!.facts,
    );

    assert.equal(analysis.summary.toLowerCase().includes("prix moyens stables"), false);
    assert.match(analysis.summary, /données DVF agrégées à interpréter avec prudence/i);
  });

  it("préfère tissu économique local au tissu entrepreneurial", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "",
        strengths: ["Tissu entrepreneurial local diversifié selon SIDE."],
        watchPoints: [],
        opportunities: [],
      },
      COMMUNE_FIXTURES.find((fixture) => fixture.id === "sirene-side-divergence")!.facts,
    );

    assert.equal(analysis.strengths[0].toLowerCase().includes("tissu entrepreneurial"), false);
    assert.match(analysis.strengths[0], /tissu économique local/i);
  });

  it("évite l'intitulé accessibilité aux infrastructures", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "Accessibilité aux infrastructures via IRVE et taxis-VTC.",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      saintGironsFactsFromFixtures(),
    );

    assert.equal(analysis.summary.toLowerCase().includes("accessibilité aux infrastructures"), false);
    assert.match(analysis.summary, /premiers équipements de mobilité recensés/i);
  });

  it("remplace la faible dépendance aux transports en commun", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "",
        strengths: [],
        watchPoints: ["Faible dépendance aux transports en commun."],
        opportunities: [],
      },
      saintGironsFactsFromFixtures(),
    );

    assert.match(
      analysis.watchPoints[0],
      /usage marginal des transports collectifs dans les déplacements domicile-travail/i,
    );
  });

  it("bloque la comparaison départementale sans benchmark sécurité", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "",
        strengths: [],
        watchPoints: ["Taux supérieur aux indicateurs départementaux."],
        opportunities: [],
      },
      COMMUNE_FIXTURES.find((fixture) => fixture.id === "rural")!.facts,
    );

    assert.equal(
      analysis.watchPoints[0].toLowerCase().includes("supérieur aux indicateurs départementaux"),
      false,
    );
  });

  it("corrige le vocabulaire AAV et les codes techniques", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "Pôle d'une aire urbaine de catégorie 4.",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      saintGironsFactsFromFixtures(),
    );

    assert.equal(analysis.summary.toLowerCase().includes("aire urbaine"), false);
    assert.match(analysis.summary, /aire d'attraction des villes/i);
    assert.match(analysis.summary, /Commune-centre d'aire d'attraction/i);
  });

  it("distingue les types CATNAT mixtes", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "",
        strengths: [],
        watchPoints: ["5 inondations CATNAT recensées."],
        opportunities: [],
      },
      saintGironsFactsFromFixtures(),
    );

    assert.equal(analysis.watchPoints[0].toLowerCase().includes("5 inondations"), false);
    assert.match(analysis.watchPoints[0], /reconnaissances CATNAT/i);
  });

  it("corrige une formulation BPE incohérente", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "",
        strengths: ["515 équipements, dont commerces (3)."],
        watchPoints: [],
        opportunities: [],
      },
      COMMUNE_FIXTURES.find((fixture) => fixture.id === "saint-girons")!.facts,
    );

    assert.equal(analysis.strengths[0].toLowerCase().includes("dont commerces (3)"), false);
    assert.match(analysis.strengths[0], /équipements recensés/i);
  });

  it("adoucit les formulations sécuritaires fortes", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "",
        strengths: [],
        watchPoints: ["Enjeux sécuritaires et problèmes sécuritaires sur la commune."],
        opportunities: [],
      },
      COMMUNE_FIXTURES.find((fixture) => fixture.id === "partial-ssmsi")!.facts,
    );

    const text = analysis.watchPoints.join(" ");
    assert.equal(text.toLowerCase().includes("enjeux sécuritaires"), false);
    assert.equal(text.toLowerCase().includes("problèmes sécuritaires"), false);
    assert.match(text, /indicateurs de sécurité|faits enregistrés par police/i);
  });

  it("n'affirme pas la mobilisation ESS/RGE sans précaution", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "",
        strengths: ["Filière ESS structurée avec acteurs mobilisables."],
        watchPoints: [],
        opportunities: [],
      },
      COMMUNE_FIXTURES.find((fixture) => fixture.id === "sirene-side-divergence")!.facts,
    );

    const text = collectText(analysis);
    assert.equal(text.toLowerCase().includes("acteurs mobilisables"), false);
    assert.equal(text.toLowerCase().includes("filière ess structurée"), false);
    assert.match(text, /potentiellement mobilisables|analyse locale plus fine|bases administratives/i);
  });

  it("évite le levier agences immobilières", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "",
        strengths: [],
        watchPoints: [],
        opportunities: ["Développer l'offre en lien avec les agences immobilières locales."],
      },
      COMMUNE_FIXTURES.find((fixture) => fixture.id === "touristic")!.facts,
    );

    assert.equal(
      analysis.opportunities[0].toLowerCase().includes("agences immobilières locales"),
      false,
    );
    assert.match(analysis.opportunities[0], /acteurs du logement/i);
  });

  it("adoucit la confusion SIDE/SIRENE/ESS/RGE", () => {
    const { analysis } = sanitizeTerritorialAnalysis(
      {
        summary: "",
        strengths: ["Les données ESS sont incluses dans le total SIDE."],
        watchPoints: [],
        opportunities: [],
      },
      COMMUNE_FIXTURES.find((fixture) => fixture.id === "sirene-side-divergence")!.facts,
    );

    assert.match(
      analysis.strengths[0],
      /en complément, les bases administratives identifient/i,
    );
    assert.equal(analysis.strengths[0].toLowerCase().includes("incluses dans le total side"), false);
  });

  it("ne modifie pas une analyse déjà prudente", () => {
    const prudent = {
      summary: "Commune-centre de l'EPCI avec un tissu économique local diversifié.",
      strengths: ["Présence d'équipements de proximité recensés en BPE."],
      watchPoints: ["Indicateurs de sécurité à interpréter avec prudence."],
      opportunities: ["Potentiel touristique à approfondir."],
    };

    const { analysis, warnings } = sanitizeTerritorialAnalysis(
      prudent,
      saintGironsFactsFromFixtures(),
    );

    assert.deepEqual(analysis, prudent);
    assert.equal(warnings.length, 0);
    assert.equal(containsForbiddenPhrases(collectText(analysis)).length, 0);
  });

  it("Saint-Girons — régression sur le profil typique", () => {
    const fixture = COMMUNE_FIXTURES.find((item) => item.id === "saint-girons")!;
    const raw = fragileAnalysisForFixture("saint-girons");
    const { analysis } = sanitizeTerritorialAnalysis(raw, fixture.facts);
    const text = collectText(analysis);

    assert.equal(text.toLowerCase().includes("chef-lieu de l'epci"), false);
    assert.equal(text.toLowerCase().includes("potentiel touristique sous-exploité"), false);
    assert.equal(text.toLowerCase().includes("actifs travaillant hors de la commune"), false);
    assert.equal(text.toLowerCase().includes("dynamique immobilière soutenue"), false);
    assert.equal(text.toLowerCase().includes("faible dépendance aux transports en commun"), false);
    assert.equal(text.toLowerCase().includes("aire urbaine"), false);
    assert.equal(text.toLowerCase().includes("5 inondations"), false);
    assert.match(text, /commune-centre|aire d'attraction/i);
  });
});

function saintGironsFactsFromFixtures() {
  return COMMUNE_FIXTURES.find((fixture) => fixture.id === "saint-girons")!.facts;
}
