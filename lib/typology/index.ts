export type {
  AttractionAreaRole,
  AttractionAreaTypologySnapshot,
  ComparisonProfile,
  DensityGridSnapshot,
  PublicPolicyTypologiesSnapshot,
  TerritoryTypology,
  TypologyCommuneCache,
  TypologyCommuneCacheEntry,
  TypologyFamilyId,
  UrbanUnitRole,
  UrbanUnitTypologySnapshot,
} from "./types";

export { buildTerritoryTypology, isTypologyFamilyAvailable } from "./build-territory-typology";
export type { TypologyBuildContext } from "./build-territory-typology";
export { deriveComparisonProfile } from "./comparison-profile";
export { buildSummaryLabel } from "./summary-label";
export {
  debtWatchPointThresholdEur,
  qualifiesAsLowPublicTransportShare,
  qualifiesAsProfileAwareDebtWatchPoint,
  qualifiesAsProfileAwareVacancyWatchPoint,
  resolveComparisonProfile,
  vacancyWatchPointThresholdPercent,
  VACANCY_WATCH_POINT_THRESHOLD_PERCENT,
  DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR,
} from "./thresholds";
