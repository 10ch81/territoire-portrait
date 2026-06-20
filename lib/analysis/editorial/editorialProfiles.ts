import type { AnalysisFactTheme } from "../types";
import type { EditorialProfileId } from "../../types";

export type { EditorialProfileId };

export type EditorialProfile = {
  id: EditorialProfileId;
  label: string;
  preferredStrengthThemes: AnalysisFactTheme[];
  preferredWatchThemes: AnalysisFactTheme[];
  bannedWeakStrengthPatterns: RegExp[];
  requiresPerCapitaCaution?: boolean;
  smallNumbersCaution?: boolean;
  summarySignatureKeywords: RegExp[];
};

const INVENTORY_STRENGTH_PATTERNS = [
  /^la commune compte \d/i,
  /^\d[\d\s]* postes salariés$/i,
  /^\d[\d\s]* équipements recensés/i,
  /^\d[\d\s]* places d'hébergement touristique recensées/i,
];

const FIBER_GENERIC = /fibre.*(?:éligib|couverture)/i;
const FRANCE_SERVICES_SINGLE = /france services/i;
const ESS_RGE_INVENTORY = /\b(?:ESS|RGE)\b.*recens/i;
const TOURISM_OUT_OF_CONTEXT = /places d'hébergement touristique/i;

export const editorialProfiles: Record<EditorialProfileId, EditorialProfile> = {
  largeUrbanCenter: {
    id: "largeUrbanCenter",
    label: "grande centralité urbaine",
    preferredStrengthThemes: [
      "centrality",
      "employment_sectors",
      "equipments",
      "economy",
      "public_services",
    ],
    preferredWatchThemes: [
      "employment",
      "policy_city",
      "security",
      "finances",
      "housing",
    ],
    bannedWeakStrengthPatterns: [
      ...INVENTORY_STRENGTH_PATTERNS,
      FIBER_GENERIC,
      FRANCE_SERVICES_SINGLE,
      ESS_RGE_INVENTORY,
      TOURISM_OUT_OF_CONTEXT,
    ],
    summarySignatureKeywords: [
      /métropole|centralité|ville-centre|base d'emploi|équipements/i,
    ],
  },
  growthEpciCentrality: {
    id: "growthEpciCentrality",
    label: "centralité en croissance dans l'EPCI",
    preferredStrengthThemes: [
      "centrality",
      "demography",
      "employment_sectors",
      "equipments",
      "economy",
    ],
    preferredWatchThemes: ["risks", "security", "housing", "finances"],
    bannedWeakStrengthPatterns: [
      ...INVENTORY_STRENGTH_PATTERNS,
      FIBER_GENERIC,
      FRANCE_SERVICES_SINGLE,
      TOURISM_OUT_OF_CONTEXT,
    ],
    summarySignatureKeywords: [
      /croissance|centralité|rang|EPCI|base d'emploi/i,
    ],
  },
  mountainTourismCenter: {
    id: "mountainTourismCenter",
    label: "ville-centre de montagne à vocation touristique",
    preferredStrengthThemes: ["tourism", "employment_sectors", "equipments"],
    preferredWatchThemes: ["risks", "housing", "finances", "security", "demography"],
    bannedWeakStrengthPatterns: [...INVENTORY_STRENGTH_PATTERNS, FIBER_GENERIC, FRANCE_SERVICES_SINGLE],
    requiresPerCapitaCaution: true,
    summarySignatureKeywords: [
      /touristique|montagne|hébergement|population résidente|fréquentation/i,
    ],
  },
  smallPeriurbanGrowth: {
    id: "smallPeriurbanGrowth",
    label: "petite commune périurbaine en croissance",
    preferredStrengthThemes: ["centrality", "demography", "connectivity", "employment_sectors"],
    preferredWatchThemes: ["security", "risks"],
    bannedWeakStrengthPatterns: [...INVENTORY_STRENGTH_PATTERNS, FIBER_GENERIC],
    smallNumbersCaution: true,
    summarySignatureKeywords: [/croissance|rang|périurbain|centralité locale|petite commune|développement/i],
  },
  employmentPole: {
    id: "employmentPole",
    label: "pôle d'emploi local",
    preferredStrengthThemes: ["employment_sectors", "economy", "centrality"],
    preferredWatchThemes: ["employment", "mobility", "finances"],
    bannedWeakStrengthPatterns: [...INVENTORY_STRENGTH_PATTERNS, ESS_RGE_INVENTORY],
    summarySignatureKeywords: [/emploi|postes salariés|base économique/i],
  },
  ruralDecline: {
    id: "ruralDecline",
    label: "commune rurale en recul démographique",
    preferredStrengthThemes: ["centrality", "equipments", "public_services"],
    preferredWatchThemes: ["demography", "ageing", "housing", "finances"],
    bannedWeakStrengthPatterns: INVENTORY_STRENGTH_PATTERNS,
    summarySignatureKeywords: [/recul|rural|démographique/i],
  },
  socialFragilityUrban: {
    id: "socialFragilityUrban",
    label: "territoire urbain avec fragilités sociales",
    preferredStrengthThemes: ["equipments", "employment_sectors", "public_services"],
    preferredWatchThemes: ["employment", "policy_city", "security", "social_housing"],
    bannedWeakStrengthPatterns: [...INVENTORY_STRENGTH_PATTERNS, ESS_RGE_INVENTORY],
    summarySignatureKeywords: [/quartiers prioritaires|chômage|insertion|social/i],
  },
  genericCentralite: {
    id: "genericCentralite",
    label: "centralité territoriale",
    preferredStrengthThemes: ["centrality", "equipments", "employment_sectors"],
    preferredWatchThemes: ["security", "risks", "finances"],
    bannedWeakStrengthPatterns: INVENTORY_STRENGTH_PATTERNS,
    summarySignatureKeywords: [/centralité|territoire/i],
  },
};

export function getEditorialProfile(id: EditorialProfileId): EditorialProfile {
  return editorialProfiles[id];
}
