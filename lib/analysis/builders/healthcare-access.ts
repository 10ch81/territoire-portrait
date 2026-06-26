import type { TerritoryProfile } from "../../types";
import { formatAplConsultations } from "../../apl";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildHealthcareAccessFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const access = territory.enrichment?.healthcareAccess;

  if (!access?.available || !access.generalPractitioner.available) {
    return facts;
  }

  const gp = access.generalPractitioner;
  const formattedValue = formatAplConsultations(gp.value);
  const departmentContext =
    gp.departmentMedian !== null
      ? ` (médiane départementale ${formatAplConsultations(gp.departmentMedian)})`
      : "";

  facts.push(
    createFact({
      theme: "health",
      target: "summary",
      sentence: `L'accessibilité potentielle aux médecins généralistes (APL DREES) s'établit à ${formattedValue}${departmentContext} en ${gp.year}.`,
      sourceKeys: ["drees-apl"],
      year: gp.year,
      confidence: "medium",
      limitations: [
        "APL DREES : potentiel d'accès aux consultations, distinct du dénombrement FINESS/BPE.",
        "Ne mesure pas les délais de rendez-vous ni l'acceptation de nouveaux patients.",
      ],
      numericBindings: [
        binding(gp.value, "APL médecins généralistes", "health", [
          "APL",
          "médecins généralistes",
          "accessibilité",
        ]),
      ],
    }),
  );

  if (gp.valueUnder65 !== null && gp.valueUnder65 !== gp.value) {
    facts.push(
      createFact({
        theme: "health",
        target: "watchPoints",
        sentence: `En ne retenant que les médecins généralistes de 65 ans et moins, l'APL passe à ${formatAplConsultations(gp.valueUnder65)} (DREES ${gp.year}).`,
        sourceKeys: ["drees-apl"],
        year: gp.year,
        confidence: "medium",
        limitations: [
          "Variante APL hors praticiens proches de la retraite ; signal de fragilité future, pas de verdict automatique.",
        ],
        numericBindings: [
          binding(gp.valueUnder65, "APL médecins généralistes moins de 65 ans", "health", [
            "APL",
            "65 ans",
            "médecins généralistes",
          ]),
        ],
      }),
    );
  }

  return facts;
}
