import type { TerritoryProfile } from "../../types";
import {
  computeDebtPaybackYearsFromSnapshot,
  computeDebtServiceToRevenuePercentFromSnapshot,
} from "../../enrichment/public-accounts";
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
        numericBindings: [
          binding(
            urbanPolicy.qpvCount,
            "quartiers prioritaires QPV",
            "policy_city",
            ["QPV", "quartiers prioritaires", "politique de la ville"],
          ),
        ],
      }),
    );

    if (
      urbanPolicy.qpvLabels &&
      urbanPolicy.qpvLabels.length > 0 &&
      urbanPolicy.qpvLabels.length <= 8
    ) {
      facts.push(
        createFact({
          theme: "policy_city",
          target: "summary",
          sentence: `Quartiers prioritaires recensés : ${urbanPolicy.qpvLabels.join(", ")} (QPV).`,
          sourceKeys: ["qpv"],
          year: urbanPolicy.year,
          confidence: "high",
          limitations: [
            "Liste des QPV sur la commune ; enjeux localisés, pas généralisables.",
          ],
        }),
      );
    }
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
    const debtIsWatchPoint = qualifiesAsDebtWatchPoint(accounts.debtPerCapitaEur);
    const paybackYears = computeDebtPaybackYearsFromSnapshot(accounts);
    const debtServicePercent = computeDebtServiceToRevenuePercentFromSnapshot(
      accounts,
    );

    facts.push(
      createFact({
        theme: "finances",
        target: debtIsWatchPoint ? "watchPoints" : "summary",
        sentence: `La dette communale s'élève à ${Math.round(accounts.debtPerCapitaEur).toLocaleString("fr-FR")} € par habitant (OFGL ${accounts.year}).`,
        sourceKeys: ["ofgl"],
        year: accounts.year,
        confidence: "medium",
        limitations: [
          "Indicateur par habitant ; à lire avec le délai de désendettement et la charge annuelle de la dette.",
        ],
      }),
    );

    if (paybackYears !== null) {
      facts.push(
        createFact({
          theme: "finances",
          target: "summary",
          sentence: `Le délai de désendettement s'élève à ${paybackYears.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ans (encours / épargne brute, OFGL ${accounts.year}).`,
          sourceKeys: ["ofgl"],
          year: accounts.year,
          confidence: "medium",
          limitations: [
            "Nombre d'années théoriques si toute l'épargne brute servait au remboursement ; indicateur OFGL, pas un jugement de gestion.",
          ],
          numericBindings: [
            binding(
              paybackYears,
              "délai désendettement OFGL",
              "finances",
              ["dette", "épargne brute", "désendettement", "OFGL"],
            ),
          ],
        }),
      );
    }

    if (debtServicePercent !== null) {
      const ratioPercent = Math.round(debtServicePercent);
      facts.push(
        createFact({
          theme: "finances",
          target: debtIsWatchPoint ? "watchPoints" : "summary",
          sentence: `L'annuité de la dette représente ${ratioPercent} % des recettes de fonctionnement annuelles (OFGL ${accounts.year}), à contextualiser avec la capacité d'investissement.`,
          sourceKeys: ["ofgl"],
          year: accounts.year,
          confidence: "medium",
          limitations: [
            "Charge annuelle de la dette (intérêts et capital) rapportée aux recettes de fonctionnement ; budget principal OFGL.",
          ],
          numericBindings: [
            binding(
              ratioPercent,
              "ratio annuité/recettes OFGL",
              "finances",
              ["annuité", "dette", "recettes", "OFGL"],
            ),
          ],
        }),
      );
    }
  }

  return facts;
}
