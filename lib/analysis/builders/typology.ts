import { isAavCommuneCentre } from "../../typology/labels";
import type { TerritoryProfile } from "../../types";
import type { AnalysisFact } from "../types";
import { SOURCE_IDS } from "../../sources";
import { createFact } from "./utils";

function buildDensityFact(territory: TerritoryProfile): AnalysisFact | null {
  const density = territory.enrichment?.territoryTypology?.densityGrid;
  if (!density?.available || !density.simplifiedLabel) {
    return null;
  }

  const sentence = density.simplifiedLabel.startsWith("commune")
    ? `La ${density.simplifiedLabel} selon la grille communale de densité INSEE.`
    : `La commune relève de la catégorie « ${density.levelLabel ?? density.simplifiedLabel} » selon la grille communale de densité INSEE.`;

  return createFact({
    id: "typology-density",
    theme: "geography",
    target: "summary",
    sentence,
    sourceKeys: [SOURCE_IDS.INSEE_DENSITY_GRID],
    year: density.vintage,
    confidence: "high",
  });
}

function buildAavFact(territory: TerritoryProfile): AnalysisFact | null {
  const aav = territory.enrichment?.territoryTypology?.attractionArea;
  if (!aav?.available) {
    return null;
  }

  let sentence: string | null = null;

  switch (aav.role) {
    case "pole":
      sentence =
        aav.categoryCode && isAavCommuneCentre(aav.categoryCode)
          ? "La commune est la ville-centre d'une aire d'attraction des villes."
          : "La commune appartient au pôle d'une aire d'attraction des villes.";
      break;
    case "couronne":
      sentence =
        "La commune appartient à la couronne d'une aire d'attraction des villes.";
      break;
    case "hors_attraction":
      sentence = "La commune est classée hors attraction des villes.";
      break;
    default:
      if (aav.categoryLabel) {
        sentence = `La commune relève de la typologie « ${aav.categoryLabel} » (AAV2020).`;
      }
      break;
  }

  if (!sentence) {
    return null;
  }

  return createFact({
    id: "typology-aav",
    theme: "geography",
    target: "summary",
    sentence,
    sourceKeys: [SOURCE_IDS.AAV],
    year: aav.vintage ?? 2020,
    confidence: "high",
  });
}

function buildUrbanUnitFact(territory: TerritoryProfile): AnalysisFact | null {
  const uu = territory.enrichment?.territoryTypology?.urbanUnit;
  if (!uu?.available) {
    return null;
  }

  if (uu.belongsToUrbanUnit === false || uu.role === "commune_isolee") {
    return createFact({
      id: "typology-uu",
      theme: "geography",
      target: "summary",
      sentence: "La commune est hors unité urbaine au sens INSEE.",
      sourceKeys: [SOURCE_IDS.INSEE_URBAN_UNIT],
      year: uu.vintage ?? 2020,
      confidence: "high",
    });
  }

  let sentence: string | null = null;
  switch (uu.role) {
    case "ville_centre":
      sentence = "La commune est la ville-centre d'une unité urbaine.";
      break;
    case "banlieue":
      sentence = "La commune appartient à la banlieue d'une unité urbaine.";
      break;
    default:
      if (uu.unitLabel) {
        sentence = `La commune appartient à l'unité urbaine ${uu.unitLabel}.`;
      }
      break;
  }

  if (!sentence) {
    return null;
  }

  return createFact({
    id: "typology-uu",
    theme: "geography",
    target: "summary",
    sentence,
    sourceKeys: [SOURCE_IDS.INSEE_URBAN_UNIT],
    year: uu.vintage ?? 2020,
    confidence: "high",
  });
}

function buildPublicPolicyFacts(territory: TerritoryProfile): AnalysisFact[] {
  const policy = territory.enrichment?.territoryTypology?.publicPolicyTypologies;
  if (!policy?.available) {
    return [];
  }

  const facts: AnalysisFact[] = [];

  if (policy.petitesVillesDeDemain) {
    facts.push(
      createFact({
        id: "typology-pvd",
        theme: "geography",
        target: "summary",
        sentence:
          "La commune est labellisée Petites villes de demain (contexte d'ingénierie territoriale, sans qualification de fragilité).",
        sourceKeys: [SOURCE_IDS.ANCT_PVD],
        year: policy.vintage,
        confidence: "high",
      }),
    );
  }

  if (policy.actionCoeurDeVille) {
    facts.push(
      createFact({
        id: "typology-acv",
        theme: "geography",
        target: "summary",
        sentence:
          "La commune participe au programme Action cœur de ville (contexte de revitalisation, sans point d'attention automatique).",
        sourceKeys: [SOURCE_IDS.ANCT_ACV],
        year: policy.vintage,
        confidence: "high",
      }),
    );
  }

  if (policy.franceRuralitesRevitalisation) {
    const plus = policy.franceRuralitesRevitalisationPlus ? " plus" : "";
    facts.push(
      createFact({
        id: "typology-frr",
        theme: "geography",
        target: "summary",
        sentence: `La commune est classée en zone France Ruralités Revitalisation${plus} (contexte de comparaison, sans diagnostic automatique).`,
        sourceKeys: [SOURCE_IDS.DGCL_FRR],
        year: policy.vintage,
        confidence: "high",
      }),
    );
  }

  if (policy.villagesAvenir) {
    facts.push(
      createFact({
        id: "typology-villages-avenir",
        theme: "geography",
        target: "summary",
        sentence:
          "La commune est labellisée Villages d'avenir (contexte d'accompagnement de projets ruraux).",
        sourceKeys: [SOURCE_IDS.ANCT_VILLAGES_AVENIR],
        year: policy.vintage,
        confidence: "high",
      }),
    );
  }

  return facts;
}

export function buildTypologyFacts(territory: TerritoryProfile): AnalysisFact[] {
  if (!territory.enrichment?.territoryTypology) {
    return [];
  }

  return [
    buildDensityFact(territory),
    buildAavFact(territory),
    buildUrbanUnitFact(territory),
    ...buildPublicPolicyFacts(territory),
  ].filter((fact): fact is AnalysisFact => fact !== null);
}
