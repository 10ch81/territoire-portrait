import type { TerritoryProfile } from "../../types";
import { formatCount } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildHealthFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const health = territory.enrichment?.health;

  if (!health?.available || health.totalEstablishments <= 0) return facts;

  facts.push(
    createFact({
      theme: "health",
      target: "strengths",
      sentence: `${formatCount(health.totalEstablishments)} établissements de santé et d'accompagnement social recensés sur la commune en ${health.year} (FINESS).`,
      sourceKeys: ["finess"],
      year: health.year,
      confidence: "medium",
      limitations: [
        "Comptages agrégés FINESS ; complète le BPE domaine D.",
        "Ne mesure pas l'accessibilité aux soins ni la desserte populationnelle.",
      ],
      numericBindings: [
        binding(
          health.totalEstablishments,
          "établissements FINESS",
          "health",
          ["FINESS", "établissements", "sanitaires", "médico-social"],
        ),
      ],
    }),
  );

  const topCategories = health.byCategory.slice(0, 3);
  if (topCategories.length > 0) {
    const list = topCategories
      .map((c) => `${c.label} (${formatCount(c.count)})`)
      .join(", ");

    facts.push(
      createFact({
        theme: "health",
        target: "summary",
        sentence: `Principales catégories recensées : ${list} (FINESS).`,
        sourceKeys: ["finess"],
        year: health.year,
        confidence: "medium",
        limitations: ["Catégories FINESS ; pas d'inférence sur la proximité des soins."],
      }),
    );
  }

  return facts;
}
