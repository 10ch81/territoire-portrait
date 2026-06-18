import type { TerritoryProfile } from "../../types";
import { createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildRiskFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const risks = territory.enrichment?.risks;

  if (!risks?.available) return facts;

  const catNatLabels = [...new Set(risks.catNatEvents.map((e) => e.label))];

  if (catNatLabels.length > 0) {
    const labelText =
      catNatLabels.length <= 3
        ? catNatLabels.join(", ")
        : `${catNatLabels.slice(0, 2).join(", ")} et autres événements`;

    facts.push(
      createFact({
        theme: "risks",
        target: "watchPoints",
        sentence: `La commune a été reconnue à plusieurs reprises en état de catastrophe naturelle pour ${labelText.toLowerCase()} (CATNAT).`,
        sourceKeys: ["georisques"],
        confidence: "high",
        limitations: [
          "Risques naturels (CATNAT/Géorisques) ; distinct des indicateurs SSMSI.",
        ],
        evidence: [`${risks.catNatEvents.length} reconnaissance(s) CATNAT recensée(s).`],
      }),
    );
  }

  if (risks.flood && risks.flood.count > 0) {
    facts.push(
      createFact({
        theme: "risks",
        target: "watchPoints",
        sentence: `Des zones à risque d'inondation sont recensées sur la commune (${risks.flood.count} zone(s)).`,
        sourceKeys: ["georisques"],
        confidence: "high",
        limitations: ["Données Géorisques ; distinct de la sécurité enregistrée SSMSI."],
      }),
    );
  }

  if (risks.radon) {
    facts.push(
      createFact({
        theme: "risks",
        target: "watchPoints",
        sentence: `Potentiel radon classé ${risks.radon.label.toLowerCase()} sur la commune.`,
        sourceKeys: ["georisques"],
        confidence: "high",
        limitations: ["Risque naturel radon ; distinct des indicateurs SSMSI."],
      }),
    );
  }

  return facts;
}
