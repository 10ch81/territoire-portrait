import type { TerritoryProfile } from "../../types";
import { formatPercent } from "../format";
import { renderCountedLabel } from "../render-text";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildMobilityFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const commute = territory.enrichment?.mobility?.commute;

  if (!commute?.available) return facts;

  if (commute.carSharePercent !== null) {
    facts.push(
      createFact({
        theme: "mobility",
        target: "summary",
        sentence: `La voiture est le mode principal de déplacement domicile-travail pour ${formatPercent(commute.carSharePercent)} des actifs occupés en ${commute.year}.`,
        sourceKeys: ["insee-commute"],
        year: commute.year,
        confidence: "high",
        limitations: [
          "Parts modales domicile-travail (recensement) ; ne décrit pas l'offre réelle de transport collectif.",
        ],
        numericBindings: [
          binding(
            commute.carSharePercent,
            "part voiture domicile-travail",
            "mobility",
            ["voiture", "automobile", "domicile-travail", "actifs"],
          ),
        ],
      }),
    );
  }

  if (commute.publicTransportSharePercent !== null) {
    facts.push(
      createFact({
        theme: "mobility",
        target: "summary",
        sentence: `Les transports en commun représentent ${formatPercent(commute.publicTransportSharePercent)} des déplacements domicile-travail en ${commute.year}.`,
        sourceKeys: ["insee-commute"],
        year: commute.year,
        confidence: "high",
        limitations: [
          "Parts des déplacements domicile-travail (recensement) ; ne mesure pas l'offre GTFS, lignes ou horaires.",
        ],
        numericBindings: [
          binding(
            commute.publicTransportSharePercent,
            "part transports en commun",
            "mobility",
            ["transports en commun", "TC", "domicile-travail"],
          ),
        ],
      }),
    );
  }

  return facts;
}

export function buildEnergyFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const irve = territory.enrichment?.mobility?.irve;

  if (!irve?.available || irve.chargingPoints <= 0) return facts;

  facts.push(
    createFact({
      theme: "energy",
      target: "summary",
      sentence: `La commune compte ${irve.chargingPoints.toLocaleString("fr-FR")} points de recharge pour véhicules électriques (${renderCountedLabel(irve.stations, "station", "stations")}, IRVE).`,
      sourceKeys: ["irve"],
      year: irve.year,
      confidence: "high",
      limitations: [
        "Points de charge électrique IRVE ; distinct de la couverture fibre ARCEP.",
      ],
      numericBindings: [
        binding(irve.chargingPoints, "points de charge IRVE", "energy", [
          "IRVE",
          "points de charge",
          "véhicules électriques",
        ]),
      ],
    }),
  );

  return facts;
}
