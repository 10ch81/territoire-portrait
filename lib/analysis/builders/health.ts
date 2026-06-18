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
      sentence: `FINESS recense ${formatCount(health.totalEstablishments)} établissements sanitaires et médico-sociaux ouverts sur la commune en ${health.year}.`,
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
        sentence: `Principales catégories FINESS recensées : ${list}.`,
        sourceKeys: ["finess"],
        year: health.year,
        confidence: "medium",
        limitations: ["Catégories FINESS ; pas d'inférence sur la proximité des soins."],
      }),
    );
  }

  return facts;
}
