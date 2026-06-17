import { createSsmsiSource } from "../sources";
import { loadJsonCache } from "./cache";
import type {
  SecurityCommuneCache,
  SecurityDepartmentCache,
  SecurityIndicatorSnapshot,
  SecuritySnapshot,
  TerritoryProfile,
} from "../types";

const COMMUNE_CACHE_FILE = "security-by-commune.json";
const DEPARTMENT_CACHE_FILE = "security-by-department.json";

export const SECURITY_INDICATOR_DEFS = [
  { id: "burglaries", label: "Cambriolages de logement" },
  { id: "violent_theft", label: "Vols violents sans arme" },
  { id: "physical_violence", label: "Violences physiques hors cadre familial" },
  { id: "vandalism", label: "Destructions et dégradations volontaires" },
  { id: "fraud", label: "Escroqueries et fraudes aux moyens de paiement" },
  { id: "vehicle_theft", label: "Vols de véhicule" },
] as const;

const INDICATOR_LABEL_BY_ID = Object.fromEntries(
  SECURITY_INDICATOR_DEFS.map((indicator) => [indicator.id, indicator.label]),
) as Record<string, string>;

function buildIndicators(
  communeEntry: SecurityCommuneCache[string] | undefined,
  departmentEntry: SecurityDepartmentCache[string] | undefined,
): SecurityIndicatorSnapshot[] {
  return SECURITY_INDICATOR_DEFS.map(({ id, label }) => {
    const communeIndicator = communeEntry?.indicators[id];
    const departmentIndicator = departmentEntry?.indicators[id];

    return {
      id,
      label,
      count: communeIndicator?.count ?? null,
      ratePer1000: communeIndicator?.ratePer1000 ?? null,
      departmentRatePer1000: departmentIndicator?.ratePer1000 ?? null,
      diffused: communeIndicator?.diffused === true,
    };
  });
}

export function loadSecuritySnapshot(territory: TerritoryProfile): SecuritySnapshot {
  const communeCache = loadJsonCache<SecurityCommuneCache>(COMMUNE_CACHE_FILE);
  const departmentCache = loadJsonCache<SecurityDepartmentCache>(DEPARTMENT_CACHE_FILE);
  const communeEntry = communeCache?.[territory.inseeCode];
  const departmentCode = territory.department?.code ?? communeEntry?.departmentCode;
  const departmentEntry = departmentCode
    ? departmentCache?.[departmentCode]
    : undefined;

  if (!communeEntry) {
    return {
      year: 2024,
      indicators: buildIndicators(undefined, departmentEntry),
      diffusedIndicatorCount: 0,
      available: false,
      note:
        "Données SSMSI absentes du cache local (exécutez npm run ingest:security). " +
        "Couverture communale partielle selon les règles de diffusion du ministère de l'Intérieur.",
    };
  }

  const indicators = buildIndicators(communeEntry, departmentEntry);
  const diffusedIndicatorCount = indicators.filter((indicator) => indicator.diffused).length;

  return {
    year: communeEntry.year,
    indicators,
    diffusedIndicatorCount,
    available: diffusedIndicatorCount > 0,
    note:
      "Crimes et délits enregistrés par la police et la gendarmerie (lieu de commission, SSMSI). " +
      "Taux pour 1 000 habitants lorsque l'indicateur est diffusé ; sinon non disponible (secret statistique).",
  };
}

export { createSsmsiSource, INDICATOR_LABEL_BY_ID };
