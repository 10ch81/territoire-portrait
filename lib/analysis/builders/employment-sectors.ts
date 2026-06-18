import type { TerritoryProfile } from "../../types";
import { formatCount } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildEmploymentSectorsFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const flores = territory.enrichment?.employmentSectors;

  if (!flores?.available) return facts;

  facts.push(
    createFact({
      theme: "employment_sectors",
      target: "strengths",
      sentence: `L'emploi salarié local est décrit par FLORES INSEE ${flores.year} : ${formatCount(flores.totalEstablishments)} établissements et ${formatCount(flores.totalSalariedPosts)} postes salariés au total.`,
      sourceKeys: ["insee-flores"],
      year: flores.year,
      confidence: "high",
      limitations: [
        "FLORES = postes salariés fin d'année sur le lieu de travail ; pas d'analyse d'évolution temporelle.",
        "Périmètre distinct de SIDE (stocks UL/ET) et de SIRENE.",
      ],
      numericBindings: [
        binding(
          flores.totalEstablishments,
          "établissements FLORES",
          "employment_sectors",
          ["établissements", "FLORES", "emploi salarié"],
        ),
        binding(
          flores.totalSalariedPosts,
          "postes salariés FLORES",
          "employment_sectors",
          ["postes salariés", "FLORES", "emploi salarié"],
        ),
      ],
    }),
  );

  const topSectors = flores.sectors
    .filter((s) => s.salariedPosts > 0)
    .slice(0, 5);

  if (topSectors.length > 0) {
    const sectorList = topSectors
      .map((s) => `${s.label} (${formatCount(s.salariedPosts)} postes)`)
      .join(", ");

    facts.push(
      createFact({
        theme: "employment_sectors",
        target: "summary",
        sentence: `Les principaux secteurs A17 recensés sont : ${sectorList}.`,
        sourceKeys: ["insee-flores"],
        year: flores.year,
        confidence: "high",
        limitations: ["Répartition sectorielle FLORES A17 ; pas de comparaison temporelle."],
      }),
    );
  }

  return facts;
}
