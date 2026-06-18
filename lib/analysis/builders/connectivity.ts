import type { TerritoryProfile } from "../../types";
import { formatPercent } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildConnectivityFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const connectivity = territory.enrichment?.mobility?.connectivity;

  if (!connectivity?.available) return facts;

  if (connectivity.fiberEligibleSharePercent !== null) {
    facts.push(
      createFact({
        theme: "connectivity",
        target: "strengths",
        sentence: `ARCEP (${connectivity.vintage}) estime à ${formatPercent(connectivity.fiberEligibleSharePercent)} la part de locaux raccordables à la fibre.`,
        sourceKeys: ["arcep-fibre"],
        year: connectivity.vintage,
        confidence: "high",
        limitations: [
          "Estimation IPE opérateurs ; distincte de la mobilité physique, de l'IRVE et du transport collectif.",
        ],
        numericBindings: [
          binding(
            connectivity.fiberEligibleSharePercent,
            "part locaux raccordables fibre",
            "connectivity",
            ["fibre", "raccordables", "ARCEP", "connectivité", "internet"],
          ),
        ],
      }),
    );
  }

  if (connectivity.technologies.length > 0) {
    facts.push(
      createFact({
        theme: "connectivity",
        target: "summary",
        sentence: `Technologies recensées par ARCEP : ${connectivity.technologies.join(", ")}.`,
        sourceKeys: ["arcep-fibre"],
        year: connectivity.vintage,
        confidence: "high",
        limitations: ["Couverture internet fixe ; ne décrit pas l'offre de transport."],
      }),
    );
  }

  return facts;
}
