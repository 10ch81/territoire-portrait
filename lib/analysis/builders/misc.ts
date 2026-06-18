import type { TerritoryProfile } from "../../types";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildPublicServicesFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const services = territory.enrichment?.proximityServices;

  if (!services?.available || services.franceServicesCount <= 0) return facts;

  facts.push(
    createFact({
      theme: "public_services",
      target: "strengths",
      sentence: `${services.franceServicesCount} structure(s) France Services recensée(s) sur la commune.`,
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
    const qpvLabel =
      urbanPolicy.qpvCount === 1
        ? "un quartier prioritaire"
        : `${urbanPolicy.qpvCount} quartiers prioritaires`;
    facts.push(
      createFact({
        theme: "policy_city",
        target: "watchPoints",
        sentence: `La commune comprend ${qpvLabel} de la politique de la ville, signalant des enjeux localisés (QPV).`,
        sourceKeys: ["qpv"],
        year: urbanPolicy.year,
        confidence: "high",
        limitations: [
          "QPV concerne des quartiers localisés ; ne pas généraliser à toute la commune.",
        ],
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
        sentence: `Le taux communal de taxe foncière sur les bâtiments s'élève à ${fiscal.propertyTaxBuiltRate.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} % (REI ${fiscal.year}).`,
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
        sentence: `La dette communale s'élève à ${Math.round(accounts.debtPerCapitaEur).toLocaleString("fr-FR")} € par habitant (OFGL ${accounts.year}).`,
        sourceKeys: ["ofgl"],
        year: accounts.year,
        confidence: "medium",
        limitations: ["Comptes publics OFGL ; budget principal ; lecture descriptive."],
      }),
    );
  }

  if (accounts?.available) {
    const revenueSentence =
      accounts.operatingRevenuePerCapitaEur !== null
        ? `Les recettes annuelles de la commune s'élèvent à ${Math.round(accounts.operatingRevenuePerCapitaEur).toLocaleString("fr-FR")} € par habitant (OFGL ${accounts.year}).`
        : accounts.operatingRevenueEur !== null
          ? `Les recettes annuelles de la commune s'élèvent à ${Math.round(accounts.operatingRevenueEur).toLocaleString("fr-FR")} € (OFGL ${accounts.year}).`
          : null;

    if (revenueSentence) {
      facts.push(
        createFact({
          theme: "finances",
          target: "summary",
          sentence: revenueSentence,
          sourceKeys: ["ofgl"],
          year: accounts.year,
          confidence: "medium",
          limitations: [
            "Comptes publics OFGL ; budget principal ; pas d'analyse de trajectoire sans série temporelle.",
          ],
          numericBindings: [
            ...(accounts.operatingRevenuePerCapitaEur !== null
              ? [
                  binding(
                    accounts.operatingRevenuePerCapitaEur,
                    "recettes fonctionnement/hab OFGL",
                    "finances",
                    ["recettes", "fonctionnement", "OFGL", "budget"],
                  ),
                ]
              : []),
            ...(accounts.operatingRevenueEur !== null
              ? [
                  binding(
                    accounts.operatingRevenueEur,
                    "recettes fonctionnement OFGL",
                    "finances",
                    ["recettes", "fonctionnement", "OFGL", "budget"],
                  ),
                ]
              : []),
          ],
        }),
      );
    }
  }

  return facts;
}
