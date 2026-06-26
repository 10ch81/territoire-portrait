import type { CompareQuestionId } from "./types";

export interface CompareThematicProfile {
  id: string;
  label: string;
  shortLabel: string;
  questionId: CompareQuestionId;
  indicatorIds: string[];
}

/** Profils thématiques pour highlights — pas de score global. */
export const COMPARE_THEMATIC_PROFILES: CompareThematicProfile[] = [
  {
    id: "familial",
    label: "Commune familiale",
    shortLabel: "plus familiale",
    questionId: "family",
    indicatorIds: ["share_under_30", "average_ips"],
  },
  {
    id: "logement",
    label: "Accessibilité au logement",
    shortLabel: "logement plus accessible (prix)",
    questionId: "housing",
    indicatorIds: ["price_per_m2", "rp_vacancy_rate", "secondary_residence_share", "owner_occupied_share"],
  },
  {
    id: "revenus",
    label: "Niveau de vie",
    shortLabel: "niveau de vie plus élevé",
    questionId: "socioeconomic",
    indicatorIds: ["median_income", "unemployment_rate", "rsa_share"],
  },
  {
    id: "equipee",
    label: "Équipements de proximité",
    shortLabel: "mieux équipée",
    questionId: "equipped",
    indicatorIds: [
      "equipments_per_1000",
      "daily_life_equipments_per_1000",
      "commerce_per_1000",
      "apl_general_practitioner",
      "health_per_1000",
      "france_services",
    ],
  },
  {
    id: "mobile",
    label: "Mobilité & connectivité",
    shortLabel: "mieux desservie en transports",
    questionId: "accessible",
    indicatorIds: ["public_transport_share", "fiber_eligible_share"],
  },
  {
    id: "dynamique",
    label: "Dynamique démographique et économique",
    shortLabel: "plus dynamique",
    questionId: "dynamic",
    indicatorIds: ["population_growth", "enterprises", "salaried_posts"],
  },
  {
    id: "dense",
    label: "Densité urbaine",
    shortLabel: "plus dense",
    questionId: "territorial_context",
    indicatorIds: ["density"],
  },
];
