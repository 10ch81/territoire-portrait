import type { TerritoryProfile } from "../types";
import { buildTerritoryContext } from "./context/buildTerritoryContext";
import {
  applyProgressiveQualification,
} from "./progressive-qualification";
import { formatEuro } from "./format";
import { hasSecurityIndicatorsAboveReference } from "./security-indicators";
import {
  DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR,
  debtWatchPointThresholdEur,
  qualifiesAsProfileAwareDebtWatchPoint,
  qualifiesAsProfileAwareVacancyWatchPoint,
  qualifiesAsLowPublicTransportShare,
  resolveComparisonProfile,
  VACANCY_WATCH_POINT_THRESHOLD_PERCENT,
} from "../typology/thresholds";
import type {
  AnalysisFact,
  AnalysisFactTarget,
  AnalysisFactTheme,
  FactIntensity,
  FactPolarity,
  QualifiedAnalysisFact,
  TerritoryAnalysisContext,
} from "./types";

/** @deprecated Préférer les constantes dans lib/typology/thresholds.ts */
export {
  DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR,
  VACANCY_WATCH_POINT_THRESHOLD_PERCENT,
} from "../typology/thresholds";

/** Seuil RP INSEE : taux de chômage 15-64 au-delà duquel un point d'attention est justifié. */
export const UNEMPLOYMENT_WATCH_POINT_THRESHOLD_PERCENT = 10;

/** Revenu médian FILOSOFI en dessous duquel un point d'attention est justifié (€). */
export const MEDIAN_INCOME_LOW_WATCH_POINT_THRESHOLD_EUR = 17_000;

/** Revenu médian modéré — éligible au score composite de fragilité (€). */
export const MEDIAN_INCOME_MODERATE_WATCH_POINT_THRESHOLD_EUR = 19_000;

/** Vacance pour score composite logement / socio-économique (%). */
export const VACANCY_FRAGILITY_THRESHOLD_PERCENT = 10;

const DESCRIPTIVE_INCOME_SENTENCE_PATTERN =
  /Le revenu médian des ménages s'élève à/i;

type QualificationCore = Pick<
  QualifiedAnalysisFact,
  "polarity" | "intensity" | "eligibleTargets" | "qualificationReason"
>;

function withTargets(
  fact: AnalysisFact,
  core: Omit<QualificationCore, "eligibleTargets"> & { eligibleTargets?: AnalysisFactTarget[] },
): QualificationCore {
  const eligibleTargets = core.eligibleTargets ?? defaultEligibleTargets(fact, core.polarity, core.intensity);
  return { ...core, eligibleTargets };
}

function defaultEligibleTargets(
  fact: AnalysisFact,
  polarity: FactPolarity,
  intensity: FactIntensity,
): AnalysisFactTarget[] {
  const targets = new Set<AnalysisFactTarget>();

  if (polarity === "neutral" || polarity === "unknown" || polarity === "negative") {
    targets.add("summary");
  }

  if (polarity === "positive" && (intensity === "medium" || intensity === "high")) {
    targets.add("strengths");
  }

  if (
    polarity === "negative" &&
    (intensity === "medium" || intensity === "high")
  ) {
    targets.add("watchPoints");
  }

  if (fact.target === "opportunities" && polarity !== "negative") {
    targets.add("opportunities");
  }

  if (targets.size === 0) {
    targets.add(fact.target);
  }

  return [...targets];
}

export function isEligibleForWatchPoint(qualified: QualifiedAnalysisFact): boolean {
  if (qualified.evidenceLevel === "weak_signal") {
    return false;
  }

  if (qualified.theme === "ageing" && qualified.benchmarkStatus === "missing") {
    return false;
  }

  return (
    qualified.eligibleTargets.includes("watchPoints") &&
    qualified.polarity === "negative" &&
    (qualified.intensity === "medium" || qualified.intensity === "high")
  );
}

export function qualifiesAsUnemploymentWatchPoint(
  unemploymentRate: number | null | undefined,
): boolean {
  if (unemploymentRate === null || unemploymentRate === undefined) {
    return false;
  }
  return unemploymentRate >= UNEMPLOYMENT_WATCH_POINT_THRESHOLD_PERCENT;
}

export function qualifiesAsDebtWatchPoint(
  debtPerCapitaEur: number | null | undefined,
  territory?: TerritoryProfile,
): boolean {
  if (debtPerCapitaEur === null || debtPerCapitaEur === undefined) {
    return false;
  }

  if (territory) {
    return qualifiesAsProfileAwareDebtWatchPoint(
      debtPerCapitaEur,
      resolveComparisonProfile(territory),
      territory.population,
    );
  }

  return debtPerCapitaEur >= DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR;
}

export function qualifiesAsVacancyWatchPoint(
  vacancyRatePercent: number | null | undefined,
  territory?: TerritoryProfile,
): boolean {
  if (vacancyRatePercent === null || vacancyRatePercent === undefined) {
    return false;
  }

  if (territory) {
    return qualifiesAsProfileAwareVacancyWatchPoint(
      vacancyRatePercent,
      resolveComparisonProfile(territory),
    );
  }

  return vacancyRatePercent >= VACANCY_WATCH_POINT_THRESHOLD_PERCENT;
}

export function qualifiesAsLowMedianIncomeForWatchPoint(
  medianIncomeEur: number | null | undefined,
): boolean {
  if (medianIncomeEur === null || medianIncomeEur === undefined) {
    return false;
  }
  return medianIncomeEur < MEDIAN_INCOME_LOW_WATCH_POINT_THRESHOLD_EUR;
}

function hasModerateMedianIncomeForComposite(
  medianIncomeEur: number | null | undefined,
): boolean {
  if (medianIncomeEur === null || medianIncomeEur === undefined) {
    return false;
  }
  return medianIncomeEur < MEDIAN_INCOME_MODERATE_WATCH_POINT_THRESHOLD_EUR;
}

function hasUnfavorableIncomeComparison(territory: TerritoryProfile): boolean {
  const income = territory.enrichment?.sociodemographics?.medianDisposableIncome;
  const reference =
    territory.enrichment?.sociodemographics &&
    "medianDisposableIncomeDepartmentEur" in territory.enrichment.sociodemographics
      ? (
          territory.enrichment.sociodemographics as {
            medianDisposableIncomeDepartmentEur?: number | null;
          }
        ).medianDisposableIncomeDepartmentEur
      : null;

  if (
    income === null ||
    income === undefined ||
    reference === null ||
    reference === undefined
  ) {
    return false;
  }

  return income < reference;
}

export function countSocioEconomicFragilitySignals(
  territory: TerritoryProfile,
): number {
  const sociodemographics = territory.enrichment?.sociodemographics;
  const housing = territory.enrichment?.housing;
  const urbanPolicy = territory.enrichment?.urbanPolicy;
  let count = 0;

  if (hasModerateMedianIncomeForComposite(sociodemographics?.medianDisposableIncome)) {
    count += 1;
  }
  if (qualifiesAsUnemploymentWatchPoint(sociodemographics?.unemploymentRate)) {
    count += 1;
  }
  if (urbanPolicy?.hasQpv === true) {
    count += 1;
  }
  if (
    housing?.rpVacancyRatePercent != null &&
    housing.rpVacancyRatePercent >= VACANCY_FRAGILITY_THRESHOLD_PERCENT
  ) {
    count += 1;
  }

  return count;
}

export function countHousingFragilitySignals(territory: TerritoryProfile): number {
  const housing = territory.enrichment?.housing;
  const urbanPolicy = territory.enrichment?.urbanPolicy;
  let count = 0;

  if (qualifiesAsVacancyWatchPoint(housing?.rpVacancyRatePercent, territory)) {
    count += 1;
  }
  if (urbanPolicy?.hasQpv === true) {
    count += 1;
  }
  if (
    housing?.socialHousingSharePercent != null &&
    housing.socialHousingSharePercent >= 25
  ) {
    count += 1;
  }

  return count;
}

export function qualifiesAsIncomeWatchPoint(territory: TerritoryProfile): boolean {
  const income = territory.enrichment?.sociodemographics?.medianDisposableIncome;
  if (income === null || income === undefined) {
    return false;
  }

  if (hasUnfavorableIncomeComparison(territory)) {
    return true;
  }

  if (qualifiesAsLowMedianIncomeForWatchPoint(income)) {
    return true;
  }

  if (
    hasModerateMedianIncomeForComposite(income) &&
    countSocioEconomicFragilitySignals(territory) >= 2
  ) {
    return true;
  }

  return false;
}

export function usesCompositeIncomeWatchPointRationale(
  territory: TerritoryProfile,
): boolean {
  const income = territory.enrichment?.sociodemographics?.medianDisposableIncome;
  if (income === null || income === undefined) {
    return false;
  }

  if (hasUnfavorableIncomeComparison(territory)) {
    return false;
  }

  if (qualifiesAsLowMedianIncomeForWatchPoint(income)) {
    return false;
  }

  return (
    hasModerateMedianIncomeForComposite(income) &&
    countSocioEconomicFragilitySignals(territory) >= 2
  );
}

export function buildIncomeWatchPointSentence(territory: TerritoryProfile): string {
  const sociodemographics = territory.enrichment!.sociodemographics!;
  const income = sociodemographics.medianDisposableIncome!;
  const year = sociodemographics.incomeYear ?? sociodemographics.year;

  if (usesCompositeIncomeWatchPointRationale(territory)) {
    return (
      `Les indicateurs socio-économiques disponibles signalent une fragilité relative, ` +
      `dont un niveau de vie médian de ${formatEuro(income)} (FILOSOFI ${year}).`
    );
  }

  if (hasUnfavorableIncomeComparison(territory)) {
    return (
      `Le niveau de vie médian apparaît inférieur à la référence disponible, ` +
      `à interpréter avec prudence (${formatEuro(income)}, FILOSOFI ${year}).`
    );
  }

  return (
    `Le niveau de vie médian apparaît faible au regard des repères retenus, ` +
    `à interpréter avec prudence (${formatEuro(income)}, FILOSOFI ${year}).`
  );
}

export function isDescriptiveIncomeWatchPointSentence(sentence: string): boolean {
  return DESCRIPTIVE_INCOME_SENTENCE_PATTERN.test(sentence);
}

function hasUnfavorableSecuritySignal(territory: TerritoryProfile): boolean {
  return hasSecurityIndicatorsAboveReference(territory.enrichment?.security);
}

function vacancyIntensity(rate: number, territory: TerritoryProfile): FactIntensity {
  if (rate >= 15) return "high";
  if (qualifiesAsVacancyWatchPoint(rate, territory)) return "medium";
  return "low";
}

function unemploymentIntensity(rate: number): FactIntensity {
  if (rate >= 15) return "high";
  if (rate >= UNEMPLOYMENT_WATCH_POINT_THRESHOLD_PERCENT) return "medium";
  return "low";
}

function debtIntensity(debtPerCapita: number, territory: TerritoryProfile): FactIntensity {
  const threshold = debtWatchPointThresholdEur(
    resolveComparisonProfile(territory),
    territory.population,
  );
  if (debtPerCapita >= Math.max(2_000, threshold * 1.5)) {
    return "high";
  }
  if (debtPerCapita >= threshold) {
    return "medium";
  }
  return "low";
}

function qualifyHousingFact(fact: AnalysisFact, territory: TerritoryProfile): QualificationCore {
  const housing = territory.enrichment?.housing;
  const vacancy = housing?.rpVacancyRatePercent;

  if (/logements vacants|vacance/i.test(fact.sentence) && vacancy != null) {
    if (qualifiesAsVacancyWatchPoint(vacancy, territory)) {
      return withTargets(fact, {
        polarity: "negative",
        intensity: vacancyIntensity(vacancy, territory),
        qualificationReason: "vacance_residentielle_elevee",
      });
    }

    return withTargets(fact, {
      polarity: "neutral",
      intensity: "low",
      qualificationReason: "vacance_residentielle_moderee",
      eligibleTargets: ["summary"],
    });
  }

  return withTargets(fact, {
    polarity: "neutral",
    intensity: "low",
    qualificationReason: "logement_descriptif",
    eligibleTargets: ["summary"],
  });
}

function qualifySocialHousingFact(fact: AnalysisFact, territory: TerritoryProfile): QualificationCore {
  const housing = territory.enrichment?.housing;

  if (/Aucun logement locatif social/i.test(fact.sentence)) {
    return withTargets(fact, {
      polarity: "unknown",
      intensity: "low",
      qualificationReason: "rpls_absence_sans_contexte_reglementaire",
      eligibleTargets: ["summary"],
    });
  }

  if (housing?.totalUnits != null && housing.totalUnits > 0) {
    return withTargets(fact, {
      polarity: "neutral",
      intensity: "low",
      qualificationReason: "rpls_descriptif",
      eligibleTargets: ["summary"],
    });
  }

  return withTargets(fact, {
    polarity: "unknown",
    intensity: "low",
    qualificationReason: "rpls_non_interpretable",
    eligibleTargets: ["summary"],
  });
}

function qualifyEmploymentFact(fact: AnalysisFact, territory: TerritoryProfile): QualificationCore {
  const rate = territory.enrichment?.sociodemographics?.unemploymentRate;

  if (rate == null) {
    return withTargets(fact, {
      polarity: "unknown",
      intensity: "low",
      qualificationReason: "chomage_indisponible",
      eligibleTargets: ["summary"],
    });
  }

  if (qualifiesAsUnemploymentWatchPoint(rate)) {
    return withTargets(fact, {
      polarity: "negative",
      intensity: unemploymentIntensity(rate),
      qualificationReason: "chomage_seuil_eleve",
    });
  }

  return withTargets(fact, {
    polarity: "neutral",
    intensity: "low",
    qualificationReason: "chomage_modere",
    eligibleTargets: ["summary"],
  });
}

function qualifyIncomeFact(fact: AnalysisFact, territory: TerritoryProfile): QualificationCore {
  if (isDescriptiveIncomeWatchPointSentence(fact.sentence)) {
    const income = territory.enrichment?.sociodemographics?.medianDisposableIncome;
    const polarity: FactPolarity =
      income != null && income >= MEDIAN_INCOME_MODERATE_WATCH_POINT_THRESHOLD_EUR
        ? "positive"
        : "neutral";

    return withTargets(fact, {
      polarity,
      intensity: "low",
      qualificationReason: "revenu_descriptif",
      eligibleTargets: ["summary"],
    });
  }

  if (qualifiesAsIncomeWatchPoint(territory)) {
    const intensity: FactIntensity = qualifiesAsLowMedianIncomeForWatchPoint(
      territory.enrichment?.sociodemographics?.medianDisposableIncome,
    )
      ? "high"
      : "medium";

    return withTargets(fact, {
      polarity: "negative",
      intensity,
      qualificationReason: usesCompositeIncomeWatchPointRationale(territory)
        ? "revenu_fragilite_composite"
        : hasUnfavorableIncomeComparison(territory)
          ? "revenu_comparaison_defavorable"
          : "revenu_seuil_bas",
    });
  }

  return withTargets(fact, {
    polarity: "neutral",
    intensity: "low",
    qualificationReason: "revenu_non_eligible_watchpoint",
    eligibleTargets: ["summary"],
  });
}

function qualifyFinancesFact(fact: AnalysisFact, territory: TerritoryProfile): QualificationCore {
  if (!/dette/i.test(fact.sentence)) {
    return withTargets(fact, {
      polarity: "neutral",
      intensity: "low",
      qualificationReason: "finances_descriptif",
      eligibleTargets: ["summary"],
    });
  }

  const debt = territory.enrichment?.publicAccounts?.debtPerCapitaEur;
  if (debt == null) {
    return withTargets(fact, {
      polarity: "unknown",
      intensity: "low",
      qualificationReason: "dette_indisponible",
      eligibleTargets: ["summary"],
    });
  }

  if (qualifiesAsDebtWatchPoint(debt, territory)) {
    return withTargets(fact, {
      polarity: "negative",
      intensity: debtIntensity(debt, territory),
      qualificationReason: "dette_seuil_eleve",
    });
  }

  return withTargets(fact, {
    polarity: "unknown",
    intensity: "low",
    qualificationReason: "dette_non_interpretable",
    eligibleTargets: ["summary"],
  });
}

function qualifySecurityFact(fact: AnalysisFact, territory: TerritoryProfile): QualificationCore {
  const security = territory.enrichment?.security;

  if (!security?.available || security.diffusedIndicatorCount === 0) {
    return withTargets(fact, {
      polarity: "unknown",
      intensity: "low",
      qualificationReason: "ssmsi_couverture_partielle",
      eligibleTargets: [],
    });
  }

  if (hasUnfavorableSecuritySignal(territory)) {
    return withTargets(fact, {
      polarity: "negative",
      intensity: "medium",
      qualificationReason: "ssmsi_au_dessus_reference",
    });
  }

  return withTargets(fact, {
    polarity: "neutral",
    intensity: "low",
    qualificationReason: "ssmsi_non_defavorable",
    eligibleTargets: [],
  });
}

function qualifyMobilityFact(fact: AnalysisFact, territory: TerritoryProfile): QualificationCore {
  const profile = resolveComparisonProfile(territory);
  const ptShare = territory.enrichment?.mobility?.commute?.publicTransportSharePercent;

  if (/transports en commun|TC/i.test(fact.sentence)) {
    if (
      ptShare != null &&
      qualifiesAsLowPublicTransportShare(ptShare, profile) &&
      (profile === "metropole" || profile === "grande_ville" || profile === "ville_moyenne")
    ) {
      return withTargets(fact, {
        polarity: "negative",
        intensity: "medium",
        qualificationReason: "mobilite_tc_faible_pour_profil_urbain",
        eligibleTargets: ["summary"],
      });
    }

    return withTargets(fact, {
      polarity: "neutral",
      intensity: "low",
      qualificationReason: "mobilite_usage_descriptif",
      eligibleTargets: ["summary"],
    });
  }

  return withTargets(fact, {
    polarity: "neutral",
    intensity: "low",
    qualificationReason: "mobilite_descriptif",
    eligibleTargets: ["summary"],
  });
}

function qualifyGeographyFact(fact: AnalysisFact): QualificationCore {
  return withTargets(fact, {
    polarity: "neutral",
    intensity: "low",
    qualificationReason: "typologie_contexte",
    eligibleTargets: ["summary"],
  });
}

function qualifyEquipmentsFact(fact: AnalysisFact, _territory: TerritoryProfile): QualificationCore {
  if (fact.target === "strengths") {
    return withTargets(fact, {
      polarity: "positive",
      intensity: "medium",
      qualificationReason: "equipements_atout",
      eligibleTargets: ["strengths"],
    });
  }

  return withTargets(fact, {
    polarity: "neutral",
    intensity: "low",
    qualificationReason: "equipements_descriptif",
    eligibleTargets: ["summary"],
  });
}

function qualifyRisksFact(fact: AnalysisFact): QualificationCore {
  return withTargets(fact, {
    polarity: "negative",
    intensity: "medium",
    qualificationReason: "risque_naturel_documente",
  });
}

function qualifyDemographyFact(fact: AnalysisFact, territory: TerritoryProfile): QualificationCore {
  const growth = territory.enrichment?.derived?.populationGrowthPercent;

  if (growth != null && growth < 0) {
    return withTargets(fact, {
      polarity: "negative",
      intensity: growth <= -5 ? "high" : "medium",
      qualificationReason: "recul_demographique",
    });
  }

  if (growth != null && growth > 0) {
    return withTargets(fact, {
      polarity: "positive",
      intensity: "medium",
      qualificationReason: "croissance_demographique",
      eligibleTargets: ["summary"],
    });
  }

  return withTargets(fact, {
    polarity: "neutral",
    intensity: "low",
    qualificationReason: "demographie_stable",
    eligibleTargets: ["summary"],
  });
}

function qualifyAgeingFact(fact: AnalysisFact, territory: TerritoryProfile): QualificationCore {
  const match = fact.sentence.match(/([\d,]+)\s*%/);
  const share = match ? Number.parseFloat(match[1].replace(",", ".")) : null;

  if (share != null && share >= 30) {
    return withTargets(fact, {
      polarity: "negative",
      intensity: share >= 40 ? "high" : "medium",
      qualificationReason: "vieillissement_eleve",
    });
  }

  return withTargets(fact, {
    polarity: "neutral",
    intensity: "low",
    qualificationReason: "structure_age_descriptive",
    eligibleTargets: ["summary"],
  });
}

function qualifyDefaultFact(fact: AnalysisFact): QualificationCore {
  if (fact.target === "watchPoints") {
    return withTargets(fact, {
      polarity: "negative",
      intensity: fact.confidence === "high" ? "medium" : "low",
      qualificationReason: "watchpoint_builder_default",
    });
  }

  if (fact.target === "strengths") {
    return withTargets(fact, {
      polarity: "positive",
      intensity: "medium",
      qualificationReason: "strength_builder_default",
      eligibleTargets: ["strengths"],
    });
  }

  if (fact.target === "opportunities") {
    return withTargets(fact, {
      polarity: "neutral",
      intensity: "low",
      qualificationReason: "opportunity_builder_default",
      eligibleTargets: ["opportunities"],
    });
  }

  return withTargets(fact, {
    polarity: "neutral",
    intensity: "low",
    qualificationReason: "descriptif_general",
    eligibleTargets: ["summary"],
  });
}

function qualifyByTheme(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): QualificationCore {
  switch (fact.theme) {
    case "housing":
      return qualifyHousingFact(fact, territory);
    case "social_housing":
      return qualifySocialHousingFact(fact, territory);
    case "employment":
      return qualifyEmploymentFact(fact, territory);
    case "income":
      return qualifyIncomeFact(fact, territory);
    case "finances":
      return qualifyFinancesFact(fact, territory);
    case "security":
      return qualifySecurityFact(fact, territory);
    case "mobility":
      return qualifyMobilityFact(fact, territory);
    case "geography":
      return qualifyGeographyFact(fact);
    case "equipments":
      return qualifyEquipmentsFact(fact, territory);
    case "risks":
      return qualifyRisksFact(fact);
    case "demography":
      return qualifyDemographyFact(fact, territory);
    case "ageing":
      return qualifyAgeingFact(fact, territory);
    default:
      return qualifyDefaultFact(fact);
  }
}

export function qualifyAnalysisFact(
  fact: AnalysisFact,
  context: TerritoryAnalysisContext,
): QualifiedAnalysisFact {
  const territoryContext =
    context.territoryContext ?? buildTerritoryContext(context.territory);
  const core = qualifyByTheme(fact, context.territory);
  return applyProgressiveQualification(
    {
      ...fact,
      ...core,
    },
    context.territory,
    territoryContext,
  );
}

export function qualifyAnalysisFacts(
  facts: AnalysisFact[],
  context: TerritoryAnalysisContext,
): QualifiedAnalysisFact[] {
  const territoryContext =
    context.territoryContext ?? buildTerritoryContext(context.territory);
  return facts.map((fact) =>
    qualifyAnalysisFact(fact, { ...context, territoryContext }),
  );
}

export function isFactEligibleForWatchPoint(
  fact: AnalysisFact,
  context: TerritoryAnalysisContext,
): boolean {
  return isEligibleForWatchPoint(qualifyAnalysisFact(fact, context));
}

/** @deprecated Préférer isFactEligibleForWatchPoint via qualifyAnalysisFact. */
export function isEligibleSocioEconomicWatchPoint(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  return isFactEligibleForWatchPoint(fact, { territory });
}

/** @deprecated Préférer qualifyAnalysisFact. */
export function isEligibleEmploymentWatchPoint(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  if (fact.theme !== "employment") return true;
  return isFactEligibleForWatchPoint(fact, { territory });
}

/** @deprecated Préférer qualifyAnalysisFact. */
export function isEligibleFinancesWatchPoint(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  if (fact.theme !== "finances" || !/dette/i.test(fact.sentence)) return true;
  return isFactEligibleForWatchPoint(fact, { territory });
}

/** @deprecated Préférer qualifyAnalysisFact. */
export function isEligibleIncomeWatchPoint(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  if (fact.theme !== "income") return true;
  return isFactEligibleForWatchPoint(fact, { territory });
}

export function countQualifiedWatchPointCandidates(
  facts: AnalysisFact[],
  context: TerritoryAnalysisContext,
): number {
  return facts.filter((fact) => isFactEligibleForWatchPoint(fact, context)).length;
}

export function qualifiedWatchPointCandidates(
  facts: AnalysisFact[],
  context: TerritoryAnalysisContext,
): AnalysisFact[] {
  return facts.filter((fact) => isFactEligibleForWatchPoint(fact, context));
}
