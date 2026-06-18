import type { TerritoryProfile } from "../../types";
import { formatCount } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildEconomyFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const enterprises = territory.enrichment?.enterprises;

  if (!enterprises?.inseeLegalUnits && !enterprises?.inseeEstablishments) {
    return facts;
  }

  const year = enterprises.inseeSideYear ?? null;
  const ul = enterprises.inseeLegalUnits;
  const et = enterprises.inseeEstablishments;

  const parts: string[] = [];
  if (ul !== null) parts.push(`${formatCount(ul)} unités légales`);
  if (et !== null) parts.push(`${formatCount(et)} établissements actifs`);

  if (parts.length === 0) return facts;

  facts.push(
    createFact({
      theme: "economy",
      target: "strengths",
      sentence: `Le tissu économique local est décrit par ${parts.join(" et ")} selon SIDE INSEE${year ? ` ${year}` : ""}.`,
      sourceKeys: ["insee-side"],
      year: year ?? undefined,
      confidence: "high",
      limitations: [
        "SIDE décrit les stocks d'unités légales et d'établissements ; distinct de FLORES (emploi salarié) et de SIRENE.",
      ],
      numericBindings: [
        ...(ul !== null
          ? [
              binding(ul, "unités légales SIDE", "economy", [
                "unités légales",
                "SIDE",
                "tissu économique",
              ]),
            ]
          : []),
        ...(et !== null
          ? [
              binding(et, "établissements SIDE", "economy", [
                "établissements",
                "SIDE",
                "tissu économique",
              ]),
            ]
          : []),
      ],
    }),
  );

  if (enterprises.divergenceWarning) {
    facts.push(
      createFact({
        theme: "economy",
        target: "summary",
        sentence: enterprises.divergenceWarning,
        sourceKeys: ["insee-side", "sirene"],
        year: year ?? undefined,
        confidence: "low",
        limitations: [
          "Écart méthodologique SIDE/SIRENE ; ne pas fusionner les périmètres dans une même conclusion.",
        ],
      }),
    );
  }

  return facts;
}

export function buildEssRgeFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const enterprises = territory.enrichment?.enterprises;

  if (!enterprises) return facts;

  const ess = enterprises.essCount;
  const rge = enterprises.rgeCount;

  if (ess === null && rge === null) return facts;

  const parts: string[] = [];
  if (ess !== null) parts.push(`${formatCount(ess)} structures ESS`);
  if (rge !== null) parts.push(`${formatCount(rge)} entreprises RGE`);

  facts.push(
    createFact({
      theme: "ess_rge",
      target: "strengths",
      sentence: `En complément, les bases administratives identifient ${parts.join(" et ")}.`,
      sourceKeys: ["sirene"],
      confidence: "medium",
      limitations: [
        "SIRENE est un répertoire administratif complémentaire ; périmètre distinct de SIDE.",
      ],
      numericBindings: [
        ...(ess !== null
          ? [binding(ess, "structures ESS", "ess_rge", ["ESS", "économie sociale"])]
          : []),
        ...(rge !== null
          ? [binding(rge, "entreprises RGE", "ess_rge", ["RGE", "rénovation"])]
          : []),
      ],
    }),
  );

  return facts;
}
