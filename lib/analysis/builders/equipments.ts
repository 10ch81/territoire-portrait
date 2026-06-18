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

  const density = territory.enrichment?.derived?.equipmentsPer1000Residents;
  if (density !== null && density !== undefined) {
    facts.push(
      createFact({
        theme: "equipments",
        target: "summary",
        sentence: `La densité d'équipements s'élève à ${density.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} occurrences pour 1 000 habitants (BPE ${equipments.year}).`,
        sourceKeys: ["insee-bpe"],
        year: equipments.year,
        confidence: "high",
        limitations: ["Ratio occurrences BPE / population légale ; ne mesure pas la qualité ni l'accessibilité."],
        numericBindings: [
          binding(density, "équipements par 1000 hab.", "equipments", [
            "équipements",
            "1000 habitants",
            "densité",
            "BPE",
          ]),
        ],
      }),
    );
  }

  const topTypes = equipments.byType
    .filter((t) => t.count > 0)
    .slice(0, 5);
  if (topTypes.length > 0) {
    const list = topTypes.map((t) => `${t.label} (${formatCount(t.count)})`).join(", ");
    facts.push(
      createFact({
        theme: "equipments",
        target: "summary",
        sentence: `Principaux types d'équipements BPE (liste partielle) : ${list}.`,
        sourceKeys: ["insee-bpe"],
        year: equipments.year,
        confidence: "medium",
        limitations: ["Liste partielle de types BPE ; distinct du total d'occurrences."],
      }),
    );
  }

  const transport = equipments.transport;
  if (transport?.available && transport.totalEquipments > 0) {
    facts.push(
      createFact({
        theme: "equipments",
        target: "summary",
        sentence: `La BPE recense ${formatCount(transport.totalEquipments)} occurrence(s) d'équipements de transport sur la commune (ne décrit pas l'offre horaire réelle).`,
        sourceKeys: ["insee-bpe"],
        year: equipments.year,
        confidence: "medium",
        limitations: [
          "Équipements BPE domaine transport ; distinct des parts modales domicile-travail RP.",
        ],
        numericBindings: [
          binding(
            transport.totalEquipments,
            "équipements transport BPE",
            "equipments",
            ["transport", "BPE", "équipements"],
          ),
        ],
      }),
    );
  }

  return facts;
}
