import type { TerritoryProfile } from "../../types";
import { formatCount } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildEmploymentSectorsFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const flores = territory.enrichment?.employmentSectors;

  if (!flores?.available) return facts;

  const population = territory.population;
  const postsPer100Residents =
    population !== null && population > 0
      ? Math.round((flores.totalSalariedPosts / population) * 100)
      : null;

  const mainStrengthSentence =
    postsPer100Residents !== null
      ? `${formatCount(flores.totalSalariedPosts)} postes salariés et ${formatCount(flores.totalEstablishments)} établissements recensés en ${flores.year}, soit environ ${formatCount(postsPer100Residents)} postes pour 100 habitants (FLORES).`
      : `${formatCount(flores.totalSalariedPosts)} postes salariés et ${formatCount(flores.totalEstablishments)} établissements recensés en ${flores.year} (FLORES).`;

  facts.push(
    createFact({
      theme: "employment_sectors",
      target: "strengths",
      sentence: mainStrengthSentence,
      sourceKeys: ["insee-flores"],
      year: flores.year,
      confidence: "high",
      limitations: [
        "FLORES complète SIDE en décrivant les postes salariés et établissements par secteur.",
        "Périmètre distinct de SIDE ; pas d'analyse d'évolution temporelle.",
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
        ...(postsPer100Residents !== null
          ? [
              binding(postsPer100Residents, "postes pour 100 habitants FLORES", "employment_sectors", [
                "postes",
                "100 habitants",
                "FLORES",
              ]),
            ]
          : []),
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
        sentence: `Les principaux secteurs d'activité recensés sont : ${sectorList} (FLORES).`,
        sourceKeys: ["insee-flores"],
        year: flores.year,
        confidence: "high",
        limitations: ["Répartition sectorielle FLORES ; pas de comparaison temporelle."],
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
          sentence: `Les postes salariés se concentrent notamment dans le secteur ${topSector.label} (${weightPercent.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % des postes, FLORES).`,
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

  if (postsPer100Residents !== null && postsPer100Residents >= 15) {
    facts.push(
      createFact({
        theme: "employment_sectors",
        target: "strengths",
        sentence: `La commune accueille davantage d'emplois salariés que ne le laisserait supposer sa seule population résidente (${formatCount(flores.totalSalariedPosts)} postes, FLORES).`,
        sourceKeys: ["insee-flores"],
        year: flores.year,
        confidence: "medium",
        limitations: [
          "Comparaison postes salariés FLORES / population résidente ; ne décrit pas un dynamisme entrepreneurial.",
        ],
        numericBindings: [
          binding(
            flores.totalSalariedPosts,
            "postes salariés FLORES",
            "employment_sectors",
            ["postes salariés", "FLORES", "emploi salarié"],
          ),
        ],
      }),
    );
  }

  return facts;
}
