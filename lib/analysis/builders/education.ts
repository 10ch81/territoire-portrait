import type { TerritoryProfile } from "../../types";
import { formatCount } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildEducationFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const education = territory.enrichment?.education;

  if (!education?.available) return facts;

  if (education.totalOpen > 0) {
    facts.push(
      createFact({
        theme: "education",
        target: "strengths",
        sentence: `L'Annuaire Éducation recense ${formatCount(education.totalOpen)} établissements scolaires ouverts en ${education.year}.`,
        sourceKeys: ["education-annuaire"],
        year: education.year,
        confidence: "medium",
        limitations: [
          "Complémentaire au BPE domaine C ; ne remplace pas les comptages BPE.",
        ],
        numericBindings: [
          binding(
            education.totalOpen,
            "établissements scolaires ouverts",
            "education",
            ["établissements scolaires", "écoles", "Annuaire Éducation", "scolarisation"],
          ),
        ],
      }),
    );
  }

  const sectors = education.bySector.filter((s) => s.count > 0);
  if (sectors.length > 0 && education.totalOpen > 0) {
    const list = sectors.map((s) => `${s.label} (${formatCount(s.count)})`).join(", ");
    facts.push(
      createFact({
        theme: "education",
        target: "summary",
        sentence: `Répartition par secteur (Annuaire Éducation) : ${list}.`,
        sourceKeys: ["education-annuaire"],
        year: education.year,
        confidence: "medium",
      }),
    );
  }

  const levels = education.byLevel.filter((l) => l.count > 0);
  if (levels.length > 0 && education.totalOpen > 0) {
    const list = levels.map((l) => `${l.label} (${formatCount(l.count)})`).join(", ");
    facts.push(
      createFact({
        theme: "education",
        target: "summary",
        sentence: `Types d'établissements (Annuaire Éducation) : ${list}.`,
        sourceKeys: ["education-annuaire"],
        year: education.year,
        confidence: "medium",
        limitations: ["Types d'établissements ; ne pas extrapoler sur les effectifs ou la qualité."],
      }),
    );
  }

  return facts;
}
