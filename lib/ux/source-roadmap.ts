export type SourceRoadmapStatus = "partial" | "planned";

export type SourceRoadmapPriority = "P1" | "P2" | "P3";

export interface SourceRoadmapEntry {
  id: string;
  name: string;
  theme: string;
  url: string;
  description: string;
  status: SourceRoadmapStatus;
  priority?: SourceRoadmapPriority;
}

/**
 * Thèmes et jeux de données pas encore pleinement intégrés au portrait.
 * Synchronisé avec docs/mcp-datagouv.md (matrice + roadmap P1–P3).
 */
export const SOURCE_ROADMAP: SourceRoadmapEntry[] = [
  {
    id: "gtfs-national",
    name: "transport.data.gouv.fr — GTFS",
    theme: "Mobilité",
    url: "https://transport.data.gouv.fr/",
    description:
      "Offre de transport collectif (arrêts, lignes). Premiers flux régionaux intégrés ; extension nationale en cours.",
    status: "partial",
    priority: "P1",
  },
  {
    id: "sirene-insee-alignment",
    name: "INSEE — démographie d'entreprises",
    theme: "Économie",
    url: "https://www.insee.fr/fr/statistiques/2011101",
    description:
      "Aligner les comptages SIRENE (API live) sur les définitions INSEE des unités légales actives.",
    status: "planned",
    priority: "P2",
  },
  {
    id: "education-directory",
    name: "Annuaire de l'Éducation",
    theme: "Équipements",
    url: "https://www.data.gouv.fr/datasets/annuaire-de-leducation",
    description: "Liste nominative des établissements scolaires ouverts.",
    status: "planned",
    priority: "P2",
  },
  {
    id: "france-services",
    name: "France Services",
    theme: "Équipements",
    url: "https://www.data.gouv.fr/datasets/liste-des-structures-labellisees-france-services",
    description: "Structures labellisées France Services de proximité.",
    status: "planned",
    priority: "P2",
  },
  {
    id: "apl-sante",
    name: "DREES — APL santé",
    theme: "Santé",
    url: "https://www.data.gouv.fr/datasets/laccessibilite-potentielle-localisee-apl",
    description: "Accessibilité potentielle localisée aux professionnels de santé.",
    status: "planned",
    priority: "P2",
  },
  {
    id: "ofgl",
    name: "OFGL — budgets et dette",
    theme: "Finances",
    url: "https://data.ofgl.fr/",
    description: "Capacité financière communale (budgets, dette), complément au REI.",
    status: "planned",
    priority: "P2",
  },
  {
    id: "pprn",
    name: "PPRN régionaux",
    theme: "Risques",
    url: "https://georisques.gouv.fr/",
    description: "Zonages réglementaires des plans de prévention des risques naturels.",
    status: "planned",
    priority: "P2",
  },
  {
    id: "banatic-syndicats",
    name: "BANATIC — syndicats et structures",
    theme: "Institutions",
    url: "https://www.banatic.interieur.gouv.fr/",
    description:
      "Syndicats mixtes et rattachements institutionnels au-delà de l'EPCI (déjà via API Géo).",
    status: "partial",
    priority: "P2",
  },
  {
    id: "dvf-plus",
    name: "Cerema — DVF+",
    theme: "Immobilier",
    url: "https://datafoncier.cerema.fr/donnees/autres-donnees-foncieres/dvfplus-open-data",
    description: "Mutations géolocalisées pour analyses fines (agrégé DVF suffit pour le MVP).",
    status: "planned",
    priority: "P3",
  },
  {
    id: "tourism",
    name: "Capacités et offre touristiques",
    theme: "Tourisme",
    url: "https://www.data.gouv.fr/datasets/datatourisme-la-base-nationale-des-donnees-publiques-dinformation-touristique-en-open-data",
    description: "Hébergements touristiques (INSEE) et base DATAtourisme.",
    status: "planned",
    priority: "P3",
  },
  {
    id: "artificialisation",
    name: "Artificialisation des sols",
    theme: "Environnement",
    url: "https://artificialisation.developpement-durable.gouv.fr/",
    description: "Consommation d'espaces et trajectoire ZAN.",
    status: "planned",
    priority: "P3",
  },
  {
    id: "observatoire-territoires",
    name: "Observatoire des territoires",
    theme: "Transversal",
    url: "https://www.observatoire-des-territoires.gouv.fr/",
    description: "Indicateurs transversaux pour comparaisons intercommunales.",
    status: "planned",
    priority: "P3",
  },
];

const PRIORITY_ORDER: SourceRoadmapPriority[] = ["P1", "P2", "P3"];

export interface SourceRoadmapGroup {
  key: SourceRoadmapPriority | "partial";
  label: string;
  entries: SourceRoadmapEntry[];
}

export function groupSourceRoadmap(
  entries: SourceRoadmapEntry[] = SOURCE_ROADMAP,
): SourceRoadmapGroup[] {
  const groups: SourceRoadmapGroup[] = [];

  for (const priority of PRIORITY_ORDER) {
    const planned = entries.filter(
      (entry) => entry.status === "planned" && entry.priority === priority,
    );
    if (planned.length > 0) {
      groups.push({
        key: priority,
        label: `Priorité ${priority}`,
        entries: planned,
      });
    }
  }

  const partial = entries.filter((entry) => entry.status === "partial");
  if (partial.length > 0) {
    groups.unshift({
      key: "partial",
      label: "Partiellement couvert",
      entries: partial,
    });
  }

  return groups;
}
