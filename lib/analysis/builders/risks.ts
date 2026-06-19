import type { TerritoryProfile } from "../../types";
import { renderCountedLabel } from "../render-text";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildRiskFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const risks = territory.enrichment?.risks;

  if (!risks?.available) return facts;

  const catNatLabels = [...new Set(risks.catNatEvents.map((event) => event.label))];

  for (const label of catNatLabels) {
    const events = risks.catNatEvents.filter((event) => event.label === label);
    const occurrenceLabel =
      events.length === 1 ? "une fois" : `${events.length} fois`;
    facts.push(
      createFact({
        theme: "risks",
        target: "watchPoints",
        sentence: `La commune a été reconnue ${occurrenceLabel} en état de catastrophe naturelle pour ${label.toLowerCase()} (CATNAT).`,
        sourceKeys: ["georisques"],
        confidence: "high",
        limitations: [
          "Risques naturels (CATNAT/Géorisques) ; distinct des indicateurs SSMSI.",
        ],
        evidence: [
          `${renderCountedLabel(
            events.length,
            "reconnaissance CATNAT recensée",
            "reconnaissances CATNAT recensées",
          )} pour ${label.toLowerCase()}.`,
        ],
      }),
    );
  }

  if (risks.flood && risks.flood.count > 0) {
    facts.push(
      createFact({
        theme: "risks",
        target: "watchPoints",
        sentence: `Des zones à risque d'inondation sont recensées sur la commune (${renderCountedLabel(risks.flood.count, "zone", "zones")}).`,
        sourceKeys: ["georisques"],
        confidence: "high",
        limitations: ["Données Géorisques ; distinct de la sécurité enregistrée SSMSI."],
        numericBindings: [
          binding(
            risks.flood.count,
            "zones à risque d'inondation",
            "risks",
            ["inondation", "zones", "Géorisques"],
          ),
        ],
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
