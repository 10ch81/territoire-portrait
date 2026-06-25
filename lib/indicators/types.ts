export type IndicatorValueType = "absolute" | "ratio" | "evolution" | "rank" | "text";

export type IndicatorGeographicScale = "commune" | "epci" | "dept" | "region";

export interface PublicIndicatorObservation {
  id: string;
  label: string;
  definition: string;
  valueType: IndicatorValueType;
  scale: IndicatorGeographicScale;
  sourceId: string;
  sourceName: string;
  displayValue: string;
  numericValue: number | null;
  vintage: number | string | null;
  fragile: boolean;
  sensitive: boolean;
  warning: string | null;
  available: boolean;
}

export interface PublicIndicatorCatalogEntry {
  id: string;
  label: string;
  definition: string;
  valueType: IndicatorValueType;
  scale: IndicatorGeographicScale;
  sourceId: string;
  sourceName: string;
  sensitive?: boolean;
}

/** Indicateurs masquables par défaut (précarité, etc.). */
export const SENSITIVE_INDICATOR_IDS = new Set<string>(["rsa_share"]);

export function isSensitiveIndicator(id: string): boolean {
  return SENSITIVE_INDICATOR_IDS.has(id);
}
