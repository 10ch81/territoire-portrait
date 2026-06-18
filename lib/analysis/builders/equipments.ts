import type { TerritoryProfile } from "../../types";
import { formatCount } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildEquipmentFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const equipments = territory.enrichment?.equipments;

  if (!equipments?.available) return facts;

  facts.push(
    createFact({
      theme: "equipments",
      target: "strengths",
      sentence: `La commune compte ${formatCount(equipments.totalEquipments)} occurrences d'équipements recensées dans la BPE ${equipments.year}.`,
      sourceKeys: ["insee-bpe"],
      year: equipments.year,
      confidence: "high",
      limitations: [
        "Total BPE = occurrences recensées ; distinct des nombres de types par domaine.",
      ],
      numericBindings: [
        binding(
          equipments.totalEquipments,
          "occurrences BPE",
          "equipments",
          ["équipements", "BPE", "occurrences", "recensées"],
        ),
      ],
    }),
  );

  if (equipments.qualitativeSummary) {
    facts.push(
      createFact({
        theme: "equipments",
        target: "summary",
        sentence: equipments.qualitativeSummary.endsWith(".")
          ? equipments.qualitativeSummary
          : `${equipments.qualitativeSummary}.`,
        sourceKeys: ["insee-bpe"],
        year: equipments.year,
        confidence: "high",
        limitations: ["Résumé qualitatif BPE ; les domaines comptent des types, pas des occurrences."],
      }),
    );
  }

  const domainLabels = equipments.byDomain.map((d) => d.label);
  if (domainLabels.length > 0) {
    facts.push(
      createFact({
        theme: "equipments",
        target: "summary",
        sentence: `Domaines d'équipements présents dans la BPE : ${domainLabels.join(", ")} (nombre de types par domaine, ne recompose pas le total).`,
        sourceKeys: ["insee-bpe"],
        year: equipments.year,
        confidence: "high",
        limitations: ["Métrique domaine = nombre de types ; ne pas confondre avec le total d'occurrences."],
      }),
    );
  }

  return facts;
}
