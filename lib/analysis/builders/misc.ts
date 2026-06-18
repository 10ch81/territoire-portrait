import type { TerritoryProfile } from "../../types";
import { createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildPublicServicesFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const services = territory.enrichment?.proximityServices;

  if (!services?.available || services.franceServicesCount <= 0) return facts;

  facts.push(
    createFact({
      theme: "public_services",
      target: "strengths",
      sentence: `France Services recense ${services.franceServicesCount} structure(s) sur la commune.`,
      sourceKeys: ["france-services"],
      year: services.year,
      confidence: "high",
    }),
  );

  return facts;
}

export function buildPolicyCityFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const urbanPolicy = territory.enrichment?.urbanPolicy;

  if (!urbanPolicy?.available) return facts;

  if (urbanPolicy.hasQpv && urbanPolicy.qpvCount > 0) {
    facts.push(
      createFact({
        theme: "policy_city",
        target: "watchPoints",
        sentence: `La commune compte ${urbanPolicy.qpvCount} quartier(s) prioritaire(s) de la politique de la ville (QPV).`,
        sourceKeys: ["qpv"],
        year: urbanPolicy.year,
        confidence: "high",
      }),
    );
  }

  return facts;
}

export function buildFinancesFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const fiscal = territory.enrichment?.fiscal;
  const accounts = territory.enrichment?.publicAccounts;

  if (fiscal?.available && fiscal.propertyTaxBuiltRate !== null) {
    facts.push(
      createFact({
        theme: "finances",
        target: "summary",
        sentence: `Le taux de taxe foncière bâti communal s'élève à ${fiscal.propertyTaxBuiltRate.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} % (REI ${fiscal.year}).`,
        sourceKeys: ["rei"],
        year: fiscal.year,
        confidence: "high",
        limitations: [
          "Taux communal REI ; ne pas interpréter comme pression fiscale globale.",
        ],
        numericBindings: [
          {
            value: fiscal.propertyTaxBuiltRate,
            label: "taux TFB communal",
            theme: "finances",
            allowedContexts: ["taxe foncière", "TFB", "REI", "fiscalité"],
          },
        ],
      }),
    );
  }

  if (accounts?.available && accounts.debtPerCapitaEur !== null) {
    facts.push(
      createFact({
        theme: "finances",
        target: "watchPoints",
        sentence: `L'encours de dette s'élève à ${Math.round(accounts.debtPerCapitaEur).toLocaleString("fr-FR")} € par habitant (OFGL ${accounts.year}).`,
        sourceKeys: ["ofgl"],
        year: accounts.year,
        confidence: "medium",
        limitations: ["Comptes publics OFGL ; lecture descriptive."],
      }),
    );
  }

  return facts;
}
