import type { TerritoryContext } from "@/lib/analysis/context/buildTerritoryContext";
import type { AnalysisFactTheme, QualifiedAnalysisFact } from "@/lib/analysis/types";
import type { TerritoryProfile } from "@/lib/types";
import type { PortraitSectorId } from "../types";

export const SECTORIAL_POSTURE = "contrasted" as const;

export type SectorFactRole = "lead" | "support" | "caution";

export type SectorRenderContext = {
  territory: TerritoryProfile;
  territoryContext: TerritoryContext;
  qualifiedFacts: QualifiedAnalysisFact[];
};

export type SectorFactSlot = {
  themes: AnalysisFactTheme[];
  role: SectorFactRole;
  maxCount: number;
  predicate?: (fact: QualifiedAnalysisFact, ctx: SectorRenderContext) => boolean;
};

export type SectorDefinition = {
  id: PortraitSectorId;
  title: string;
  slots: SectorFactSlot[];
  skipIfEmpty: boolean;
};

export const SECTOR_DEFINITIONS: SectorDefinition[] = [
  {
    id: "identity",
    title: "Identité et centralité",
    skipIfEmpty: false,
    slots: [
      { themes: ["identity"], role: "lead", maxCount: 2 },
      { themes: ["centrality"], role: "support", maxCount: 1 },
      {
        themes: ["demography"],
        role: "support",
        maxCount: 1,
        predicate: (fact) => /progresse|recule/i.test(fact.sentence),
      },
    ],
  },
  {
    id: "demography",
    title: "Démographie et jeunesse",
    skipIfEmpty: true,
    slots: [
      {
        themes: ["demography"],
        role: "lead",
        maxCount: 2,
        predicate: (fact) => /moins de 30 ans|15-29|structure par âge/i.test(fact.sentence),
      },
      { themes: ["ageing"], role: "support", maxCount: 1 },
      { themes: ["education"], role: "support", maxCount: 2 },
    ],
  },
  {
    id: "economy",
    title: "Économie et emploi",
    skipIfEmpty: true,
    slots: [
      { themes: ["employment_sectors"], role: "lead", maxCount: 2 },
      { themes: ["economy"], role: "support", maxCount: 2 },
      {
        themes: ["ess_rge"],
        role: "support",
        maxCount: 1,
        predicate: (fact) => fact.target === "strengths",
      },
    ],
  },
  {
    id: "social_fragility",
    title: "Fragilités sociales",
    skipIfEmpty: true,
    slots: [
      { themes: ["employment"], role: "lead", maxCount: 1 },
      {
        themes: ["employment"],
        role: "support",
        maxCount: 1,
        predicate: (fact) => /France Travail/i.test(fact.sentence),
      },
      { themes: ["policy_city"], role: "support", maxCount: 2 },
      { themes: ["income"], role: "support", maxCount: 1 },
    ],
  },
  {
    id: "equipments",
    title: "Équipements et services",
    skipIfEmpty: true,
    slots: [
      {
        themes: ["equipments"],
        role: "lead",
        maxCount: 2,
        predicate: (fact) =>
          !/Domaines d'équipements présents/i.test(fact.sentence) &&
          !/^Types d'établissements/i.test(fact.sentence),
      },
      { themes: ["public_services"], role: "support", maxCount: 1 },
    ],
  },
  {
    id: "health",
    title: "Santé et médico-social",
    skipIfEmpty: true,
    slots: [{ themes: ["health"], role: "lead", maxCount: 3 }],
  },
  {
    id: "housing",
    title: "Logement",
    skipIfEmpty: true,
    slots: [
      { themes: ["housing"], role: "lead", maxCount: 4 },
      { themes: ["social_housing"], role: "support", maxCount: 2 },
      { themes: ["real_estate"], role: "support", maxCount: 1 },
    ],
  },
  {
    id: "mobility",
    title: "Mobilité et connectivité",
    skipIfEmpty: true,
    slots: [
      { themes: ["mobility"], role: "lead", maxCount: 2 },
      { themes: ["connectivity"], role: "support", maxCount: 1 },
      { themes: ["energy"], role: "support", maxCount: 1 },
    ],
  },
  {
    id: "environmental_risks",
    title: "Risques environnementaux",
    skipIfEmpty: true,
    slots: [{ themes: ["risks"], role: "lead", maxCount: 3 }],
  },
  {
    id: "security",
    title: "Sécurité enregistrée",
    skipIfEmpty: true,
    slots: [
      { themes: ["security"], role: "lead", maxCount: 1 },
      {
        themes: ["security"],
        role: "support",
        maxCount: 3,
        predicate: (fact) => /pour 1[\s\u00a0]000 habitants/i.test(fact.sentence),
      },
    ],
  },
  {
    id: "tourism",
    title: "Tourisme",
    skipIfEmpty: true,
    slots: [{ themes: ["tourism"], role: "lead", maxCount: 1, predicate: (fact) => fact.target === "strengths" }],
  },
  {
    id: "public_finances",
    title: "Finances publiques",
    skipIfEmpty: true,
    slots: [
      {
        themes: ["finances"],
        role: "lead",
        maxCount: 3,
        predicate: (fact) => !/ratio dette\/recettes/i.test(fact.sentence.toLowerCase()),
      },
    ],
  },
  {
    id: "synthesis",
    title: "Synthèse",
    skipIfEmpty: false,
    slots: [
      {
        themes: ["employment_sectors", "equipments", "demography", "centrality"],
        role: "support",
        maxCount: 2,
        predicate: (fact) => fact.target === "strengths" || fact.polarity === "positive",
      },
      {
        themes: [
          "employment",
          "policy_city",
          "housing",
          "risks",
          "security",
          "finances",
        ],
        role: "support",
        maxCount: 5,
        predicate: (fact) => fact.target === "watchPoints",
      },
    ],
  },
];

export function getSectorDefinition(id: PortraitSectorId): SectorDefinition {
  const definition = SECTOR_DEFINITIONS.find((entry) => entry.id === id);
  if (!definition) {
    throw new Error(`Unknown sector id: ${id}`);
  }
  return definition;
}
