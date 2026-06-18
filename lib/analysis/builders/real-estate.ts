import type { TerritoryProfile } from "../../types";
import { formatCount, formatPricePerM2 } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

const DVF_LIMITATIONS = [
  "Moyennes agrégées sur les mutations enregistrées.",
  "Pas de distinction neuf/ancien, standing, biens atypiques, lots multiples, dépendances ni terrains nus.",
];

export function buildRealEstateFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const property = territory.enrichment?.property;

  if (!property?.available) return facts;

  const parts: string[] = [];

  if (property.mutationCount !== null && property.mutationCount > 0) {
    parts.push(`${formatCount(property.mutationCount)} mutations en ${property.year}`);
  }

  if (property.averagePricePerM2 !== null) {
    parts.push(`un prix moyen indicatif de ${formatPricePerM2(property.averagePricePerM2)}`);
  }

  if (parts.length === 0) return facts;

  facts.push(
    createFact({
      theme: "real_estate",
      target: "summary",
      sentence: `DVF recense ${parts.join(" et ")}.`,
      sourceKeys: ["dvf"],
      year: property.year,
      confidence: "high",
      limitations: DVF_LIMITATIONS,
      numericBindings: [
        ...(property.mutationCount !== null
          ? [
              binding(property.mutationCount, "mutations DVF", "real_estate", [
                "mutations",
                "DVF",
                "transactions",
              ]),
            ]
          : []),
        ...(property.averagePricePerM2 !== null
          ? [
              binding(property.averagePricePerM2, "prix moyen DVF", "real_estate", [
                "prix",
                "€/m²",
                "DVF",
                "immobilier",
              ]),
            ]
          : []),
      ],
    }),
  );

  return facts;
}
