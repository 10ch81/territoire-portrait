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
    .sort((a, b) => b.salariedPosts - a.salariedPosts);

  if (topSectors.length > 0) {
    const sectorList = topSectors
      .slice(0, 5)
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

    const topSector = topSectors[0];
    if (flores.totalSalariedPosts > 0) {
      const weightPercent =
        Math.round((topSector.salariedPosts / flores.totalSalariedPosts) * 1000) / 10;

      facts.push(
        createFact({
          theme: "employment_sectors",
          target: "summary",
          sentence: `Le secteur ${topSector.label} concentre ${weightPercent.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % des postes salariés FLORES.`,
          sourceKeys: ["insee-flores"],
          year: flores.year,
          confidence: "high",
          limitations: ["Poids sectoriel FLORES sur une seule année ; pas d'évolution temporelle."],
          numericBindings: [
            binding(weightPercent, "poids 1er secteur FLORES", "employment_sectors", [
              "secteur",
              "postes salariés",
              "FLORES",
              "%",
            ]),
          ],
        }),
      );
    }
  }

  if (
    territory.population !== null &&
    territory.population > 0 &&
    flores.totalSalariedPosts / territory.population >= 0.15
  ) {
    facts.push(
      createFact({
        theme: "employment_sectors",
        target: "strengths",
        sentence: `FLORES recense ${formatCount(flores.totalSalariedPosts)} postes salariés fin d'année, suggérant une fonction d'emploi local significative au regard de la population.`,
        sourceKeys: ["insee-flores"],
        year: flores.year,
        confidence: "medium",
        limitations: [
          "Ratio postes/population indicatif ; ne décrit pas un dynamisme entrepreneurial.",
        ],
      }),
    );
  }

  return facts;
}
