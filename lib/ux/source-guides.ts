export const ANALYSIS_LIMITS_SECTION_ID = "limites-analyse";

export type SourceGuideId = "ssmsi" | "dvf";

export type SourceReliabilityLevel = "robust" | "complementary" | "sensitive";

export interface SourceGuideDefinition {
  id: SourceGuideId;
  title: string;
  reliability: SourceReliabilityLevel;
  measures: string[];
  doesNotMeasure: string[];
  scope: string;
  sourceUrl: string;
  sourceLabel: string;
}

const SSMSI_GUIDE: SourceGuideDefinition = {
  id: "ssmsi",
  title: "SSMSI — délinquance enregistrée",
  reliability: "sensitive",
  measures: [
    "Faits de délinquance enregistrés par la police et la gendarmerie.",
    "Taux pour 1 000 habitants et volumes par type d'infraction.",
    "Comparaison avec le taux départemental lorsque l'indicateur est diffusé.",
  ],
  doesNotMeasure: [
    "Le ressenti d'insécurité des habitants.",
    "Les faits non déclarés ou non enregistrés.",
    "Une tendance interannuelle (une seule année est chargée).",
  ],
  scope:
    "Lieu de commission du fait (commune où le délit est enregistré), avec règles de secret statistique : certains indicateurs ne sont pas publiés pour les petites communes.",
  sourceUrl:
    "https://www.data.gouv.fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales",
  sourceLabel: "Jeu de données SSMSI sur data.gouv.fr",
};

const DVF_GUIDE: SourceGuideDefinition = {
  id: "dvf",
  title: "DVF — transactions immobilières",
  reliability: "sensitive",
  measures: [
    "Prix moyens au m² et montants moyens des mutations enregistrées.",
    "Nombre de mutations et répartition maisons / appartements lorsque disponible.",
    "Comparaison avec la moyenne départementale.",
  ],
  doesNotMeasure: [
    "Le standing, l'état du bien ou la qualité de l'offre.",
    "La distinction neuf / ancien, les biens atypiques, lots multiples, dépendances ou terrains nus.",
    "Un prix de marché représentatif lorsque le volume de mutations est très faible.",
  ],
  scope:
    "Mutations déclarées au service de la publicité foncière, agrégées à l'échelle communale (hors Alsace-Moselle et Mayotte pour les séries nationales).",
  sourceUrl:
    "https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-dvf/",
  sourceLabel: "Jeu de données DVF sur data.gouv.fr",
};

export const SOURCE_GUIDES: Record<SourceGuideId, SourceGuideDefinition> = {
  ssmsi: SSMSI_GUIDE,
  dvf: DVF_GUIDE,
};

export function getSourceGuide(id: SourceGuideId): SourceGuideDefinition {
  return SOURCE_GUIDES[id];
}

export const RELIABILITY_LABELS: Record<SourceReliabilityLevel, string> = {
  robust: "Source robuste",
  complementary: "Source complémentaire",
  sensitive: "Source sensible",
};

/** Seuil empirique : au-delà, les moyennes DVF communales deviennent plus lisibles. */
export const DVF_LOW_MUTATION_THRESHOLD = 10;

export function buildDvfContextAlerts(mutationCount: number | null | undefined): string[] {
  if (mutationCount === null || mutationCount === undefined) {
    return [];
  }

  if (mutationCount === 0) {
    return [
      "Aucune mutation enregistrée sur la période : les prix moyens ne sont pas publiés ou ne sont pas interprétables.",
    ];
  }

  if (mutationCount < DVF_LOW_MUTATION_THRESHOLD) {
    return [
      `Seulement ${new Intl.NumberFormat("fr-FR").format(mutationCount)} mutation(s) : la moyenne communale peut être fortement influencée par quelques ventes atypiques.`,
    ];
  }

  return [];
}
