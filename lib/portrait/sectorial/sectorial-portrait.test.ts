import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  angersProfile,
  chamonixProfile,
  palaiseauProfile,
  poulxProfile,
} from "@/lib/analysis/reference-communes";
import { buildAnalysisFacts } from "@/lib/analysis/build-analysis-facts";
import { buildTerritoryContext } from "@/lib/analysis/context/buildTerritoryContext";
import { qualifyAnalysisFacts } from "@/lib/analysis/qualify-facts";
import type { TerritoryProfile } from "@/lib/types";
import { generatePortraitNarrativeSync } from "../generate-portrait";
import { renderSectorialPortrait } from "./render-sectorial-portrait";
import { selectSectorialFacts } from "./select-sectorial-facts";
import { validateSectorialPortrait } from "./validate-sectorial-portrait";
import { buildSectorialSupplementFacts } from "./sectorial-supplement-facts";

function buildCtx(territory: TerritoryProfile) {
  const facts = buildAnalysisFacts(territory);
  const supplementFacts = buildSectorialSupplementFacts(territory);
  const territoryContext = buildTerritoryContext(territory);
  const qualifiedFacts = qualifyAnalysisFacts([...facts, ...supplementFacts], {
    territory,
    territoryContext,
  });
  return { territory, territoryContext, qualifiedFacts };
}

function synthesisParagraph(portrait: ReturnType<typeof renderSectorialPortrait>): string {
  const synthesis = portrait.sectors?.find((sector) => sector.id === "synthesis");
  assert.ok(synthesis, "rubrique synthèse attendue");
  return synthesis!.paragraph;
}

const microVillageProfile: TerritoryProfile = {
  ...poulxProfile,
  name: "Buhl",
  inseeCode: "68058",
  population: 506,
  enrichment: {
    ...poulxProfile.enrichment!,
    equipments: {
      ...poulxProfile.enrichment!.equipments!,
      totalEquipments: 14,
    },
    derived: {
      ...poulxProfile.enrichment!.derived!,
      equipmentsPer1000Residents: 27.7,
    },
  },
};

describe("sectorial portrait — Angers", () => {
  const ctx = buildCtx(angersProfile);

  it("produit au moins 10 paragraphes sectoriels", () => {
    const portrait = renderSectorialPortrait(angersProfile);
    assert.ok(portrait.paragraphs.length >= 10);
    assert.equal(portrait.generatedBy, "deterministic");
  });

  it("couvre la vacance dual registre dans le bloc logement", () => {
    const portrait = renderSectorialPortrait(angersProfile);
    const housing = portrait.sectors?.find((sector) => sector.id === "housing");
    assert.ok(housing);
    assert.match(housing!.paragraph, /6[,.]\s*0?\s*%/);
    assert.match(housing!.paragraph, /5[,.]\s*8\s*%|LOVAC/i);
  });

  it("mentionne les QPV et la jeunesse", () => {
    const portrait = renderSectorialPortrait(angersProfile);
    const social = portrait.sectors?.find((sector) => sector.id === "social_fragility");
    assert.ok(social);
    assert.match(social!.paragraph, /quartiers prioritaires|QPV/i);
    const demography = portrait.sectors?.find((sector) => sector.id === "demography");
    assert.ok(demography);
    assert.match(demography!.paragraph, /moins de 30 ans|15-29/i);
  });

  it("passe la validation sectorielle", () => {
    const portrait = renderSectorialPortrait(angersProfile);
    const selected = selectSectorialFacts(ctx.qualifiedFacts, ctx);
    const violations = validateSectorialPortrait(portrait, selected, ctx);
    assert.equal(
      violations.filter((v) => v.code === "MISSING_SECTOR").length,
      0,
      `sectors manquants: ${JSON.stringify(violations)}`,
    );
    assert.equal(
      violations.filter((v) => v.code === "FORBIDDEN_PHRASE").length,
      0,
      `phrases interdites: ${JSON.stringify(violations)}`,
    );
  });

  it("affiche des rubriques numérotées", () => {
    const portrait = renderSectorialPortrait(angersProfile);
    assert.ok(portrait.sectors && portrait.sectors.length >= 10);
    assert.equal(portrait.sectors![0]!.index, 1);
    assert.ok(portrait.sectors![0]!.title.length > 0);
  });

  it("exclut les formulations opportunité et améliore la synthèse", () => {
    const portrait = renderSectorialPortrait(angersProfile);
    const fullText = portrait.paragraphs.join(" ");

    assert.doesNotMatch(fullText, /Mobiliser les acteurs ESS/i);
    assert.doesNotMatch(fullText, /Articuler capacité d'hébergement/i);
    assert.doesNotMatch(fullText, /avec des enjeux liés à le taux/i);

    const social = portrait.sectors?.find((sector) => sector.id === "social_fragility");
    assert.ok(social);
    assert.match(social!.paragraph, /France Travail/i);

    const housing = portrait.sectors?.find((sector) => sector.id === "housing");
    assert.ok(housing);
    assert.match(housing!.paragraph, /28[,.]\s*8\s*%|logement social/i);

    const synthesis = synthesisParagraph(portrait);
    assert.match(synthesis, /combine .+ avec des enjeux liés/i);
    assert.doesNotMatch(synthesis, /pour 1 000 habitants \(référence départementale/i);
    assert.doesNotMatch(synthesis, /radon/i);
    assert.match(synthesis, /chômage|quartiers prioritaires|sécurité/i);
  });

  it("sync generate ne retourne pas null", () => {
    const result = generatePortraitNarrativeSync(angersProfile);
    assert.ok(result.portrait);
    assert.ok(result.portrait.paragraphs.length >= 10);
  });
});

describe("sectorial portrait — Palaiseau", () => {
  it("synthèse sans fuite SSMSI détaillée et avec un seul risque", () => {
    const portrait = renderSectorialPortrait(palaiseauProfile);
    const synthesis = synthesisParagraph(portrait);

    assert.doesNotMatch(synthesis, /pour 1 000 habitants \(référence départementale/i);
    assert.doesNotMatch(synthesis, /liés cambriolages/i);
    assert.match(synthesis, /chômage|sécurité|cambriolages|indicateur de sécurité/i);
    assert.doesNotMatch(synthesis, /radon/i);

    const riskMentions = [
      /risques d'inondation/i.test(synthesis),
      /catastrophes naturelles/i.test(synthesis),
    ].filter(Boolean).length;
    assert.ok(riskMentions <= 1, `risques redondants: ${synthesis}`);
  });

  it("équipements sans assertivité haut niveau (ratio urbain sous seuil)", () => {
    const portrait = renderSectorialPortrait(palaiseauProfile);
    const equipments = portrait.sectors?.find((sector) => sector.id === "equipments");
    assert.ok(equipments);
    assert.doesNotMatch(equipments!.paragraph, /haut niveau d'équipements/i);
  });
});

describe("sectorial portrait — micro-village", () => {
  it("pas d'assertivité équipements sur très petite commune", () => {
    const portrait = renderSectorialPortrait(microVillageProfile);
    const equipments = portrait.sectors?.find((sector) => sector.id === "equipments");
    assert.ok(equipments);
    assert.doesNotMatch(equipments!.paragraph, /haut niveau d'équipements/i);
  });

  it("synthèse sans radon faible comme enjeu", () => {
    const portrait = renderSectorialPortrait(microVillageProfile);
    const synthesis = synthesisParagraph(portrait);
    const risks = portrait.sectors?.find((sector) => sector.id === "environmental_risks");

    assert.ok(risks);
    assert.match(risks!.paragraph, /radon est faible/i);
    assert.doesNotMatch(synthesis, /radon/i);
  });
});

describe("sectorial portrait — profils contrastés", () => {
  it("Poulx — pas d'ouverture ville-centre attractive", () => {
    const portrait = renderSectorialPortrait(poulxProfile);
    const identity = portrait.sectors?.find((sector) => sector.id === "identity");
    assert.ok(identity);
    assert.doesNotMatch(identity!.paragraph, /ville-centre dense et attractive/i);
    assert.doesNotMatch(portrait.title, /commune-centre de/i);
  });

  it("Chamonix — pas de métaphore éditoriale", () => {
    const portrait = renderSectorialPortrait(chamonixProfile);
    for (const paragraph of portrait.paragraphs) {
      assert.doesNotMatch(paragraph, /cœur battant|métropole dynamique/i);
    }
  });
});
