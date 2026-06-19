import type { TerritoryProfile } from "../../types";
import { renderCountedLabel } from "../render-text";
import { qualifiesAsDebtWatchPoint } from "../socio-economic-watch-points";
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
      sentence: `${renderCountedLabel(
        services.franceServicesCount,
        "structure France Services recensée",
        "structures France Services recensées",
      )} sur la commune.`,
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
    const hasRevenue =
      accounts.operatingRevenueEur != null || accounts.operatingRevenuePerCapitaEur != null;
    const debtOutstanding = accounts.debtOutstandingEur;
    const operatingRevenue = accounts.operatingRevenueEur;

    if (hasRevenue && debtOutstanding != null && operatingRevenue != null && operatingRevenue > 0) {
      const debtToRevenueRatio = debtOutstanding / operatingRevenue;
      const ratioPercent = Math.round(debtToRevenueRatio * 100);
      const ratioPhrase =
        ratioPercent >= 85 && ratioPercent <= 115
          ? " ; l'encours représente environ une année de recettes de fonctionnement"
          : "";
      const debtIsWatchPoint = qualifiesAsDebtWatchPoint(accounts.debtPerCapitaEur);

      facts.push(
        createFact({
          theme: "finances",
          target: debtIsWatchPoint ? "watchPoints" : "summary",
          sentence: `L'encours de dette représente ${ratioPercent} % des recettes de fonctionnement annuelles (OFGL ${accounts.year})${ratioPhrase}, à contextualiser avec la capacité d'investissement.`,
          sourceKeys: ["ofgl"],
          year: accounts.year,
          confidence: "medium",
          limitations: [
            "Comptes publics OFGL ; budget principal ; endettement à lire avec les recettes et la capacité d'investissement.",
          ],
          numericBindings: [
            binding(
              ratioPercent,
              "ratio dette/recettes OFGL",
              "finances",
              ["dette", "recettes", "endettement", "OFGL"],
            ),
          ],
        }),
      );

      facts.push(
        createFact({
          theme: "finances",
          target: "summary",
          sentence: `La dette communale s'élève à ${Math.round(accounts.debtPerCapitaEur).toLocaleString("fr-FR")} € par habitant (OFGL ${accounts.year}).`,
          sourceKeys: ["ofgl"],
          year: accounts.year,
          confidence: "medium",
          limitations: [
            "Indicateur par habitant ; à lire avec le ratio dette/recettes et la population présente.",
          ],
        }),
      );
    } else {
      const debtIsWatchPoint = qualifiesAsDebtWatchPoint(accounts.debtPerCapitaEur);
      facts.push(
        createFact({
          theme: "finances",
          target: debtIsWatchPoint ? "watchPoints" : "summary",
          sentence: `La dette communale s'élève à ${Math.round(accounts.debtPerCapitaEur).toLocaleString("fr-FR")} € par habitant (OFGL ${accounts.year}).`,
          sourceKeys: ["ofgl"],
          year: accounts.year,
          confidence: "medium",
          limitations: debtIsWatchPoint
            ? [
                "Comptes publics OFGL ; budget principal ; lecture descriptive sans jugement de gestion.",
              ]
            : [
                "Comptes publics OFGL ; budget principal ; niveau non interprétable comme tension sans comparaison ou série.",
              ],
        }),
      );
    }
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
