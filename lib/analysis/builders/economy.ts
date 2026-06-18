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
  if (ul !== null) parts.push(`${formatCount(ul)} entreprises recensées`);
  if (et !== null) parts.push(`${formatCount(et)} établissements actifs`);

  if (parts.length === 0) return facts;

  facts.push(
    createFact({
      theme: "economy",
      target: "strengths",
      sentence: `L'activité économique locale compte ${parts.join(" et ")}${year ? ` en ${year}` : ""} (SIDE INSEE).`,
      sourceKeys: ["insee-side"],
      year: year ?? undefined,
      confidence: "high",
      limitations: [
        "SIDE décrit les entreprises et établissements recensés ; distinct de FLORES (emploi salarié) et de SIRENE.",
      ],
      numericBindings: [
        ...(ul !== null
          ? [
              binding(ul, "entreprises SIDE", "economy", [
                "entreprises",
                "SIDE",
                "activité économique",
              ]),
            ]
          : []),
        ...(et !== null
          ? [
              binding(et, "établissements SIDE", "economy", [
                "établissements",
                "SIDE",
                "activité économique",
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
      sentence: `Le répertoire administratif identifie ${parts.join(" et ")} (SIRENE).`,
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
