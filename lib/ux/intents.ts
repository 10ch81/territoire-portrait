import { buildCompareUrl } from "@/lib/compare/parse-codes";
import {
  COMPARE_EXAMPLE_CODES,
  EXAMPLE_COMMUNES,
} from "@/lib/ux/recent-communes";

export type UserIntentId =
  | "habiter"
  | "comparer"
  | "comprendre"
  | "dossier"
  | "explorer";

export interface UserIntent {
  id: UserIntentId;
  title: string;
  description: string;
  href: string;
  cta: string;
}

const DOSSIER_EXAMPLE_INSEE = EXAMPLE_COMMUNES[0]!.inseeCode;
const COMPRENDRE_EXAMPLE_INSEE = EXAMPLE_COMMUNES[2]!.inseeCode;

/** Intentions accueil — parcours complets, pas de menu « persona ». */
export const USER_INTENTS: UserIntent[] = [
  {
    id: "habiter",
    title: "Où habiter ?",
    description:
      "Priorisez famille, logement ou transports — comparez votre commune à des communes comparables.",
    href: "/#habiter",
    cta: "Lancer le questionnaire",
  },
  {
    id: "comparer",
    title: "Comparer des communes",
    description: "Tableau 2 à 5 communes, indicateurs sourcés, profils thématiques sans score global.",
    href: buildCompareUrl([...COMPARE_EXAMPLE_CODES]),
    cta: "Voir un exemple",
  },
  {
    id: "comprendre",
    title: "Comprendre une commune",
    description: "Synthèse vie quotidienne ou fiche détaillée avec analyse prudente.",
    href: `/commune/${COMPRENDRE_EXAMPLE_INSEE}`,
    cta: "Exemple Rennes",
  },
  {
    id: "dossier",
    title: "Préparer un dossier",
    description:
      "Fiscalité, finances locales et benchmark EPCI — pour élus et cadres communaux.",
    href: "/#collectivite",
    cta: "Lancer le benchmark",
  },
  {
    id: "explorer",
    title: "Explorer les données",
    description: "Catalogue d'indicateurs publics et export JSON-LD par commune.",
    href: "/api/indicators/catalog",
    cta: "Catalogue API",
  },
];

export function findUserIntent(id: string): UserIntent | undefined {
  return USER_INTENTS.find((intent) => intent.id === id);
}

export function isValidUserIntentId(id: string): id is UserIntentId {
  return USER_INTENTS.some((intent) => intent.id === id);
}
