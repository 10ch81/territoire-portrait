import { computeDerivedIndicators } from "../enrichment/derived";
import { fetchEnterpriseSnapshot } from "../enrichment/enterprises";
import { getEnrichedTerritoryByInsee } from "../enrichment";
import { loadJsonCache } from "../enrichment/cache";
import type {
  BpeCommuneCache,
  GeoApiCommune,
  IrveCommuneCache,
  PropertyCommuneCache,
} from "../types";
import { classifyIndicatorDiscrepancy } from "./classify";
import { numbersMatch } from "./compare";
import { GOLDEN_COMMUNES } from "./golden-communes";
import type { QualityFinding } from "./types";

const GEO_API_BASE = "https://geo.api.gouv.fr";

async function fetchGeoCommune(inseeCode: string): Promise<GeoApiCommune | null> {
  const fields = ["nom", "code", "population", "surface"].join(",");
  const response = await fetch(
    `${GEO_API_BASE}/communes/${inseeCode}?fields=${fields}`,
    { headers: { Accept: "application/json" } },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `API Géo inaccessible pour ${inseeCode} (statut ${response.status}).`,
    );
  }

  return (await response.json()) as GeoApiCommune;
}

function geoDensity(commune: GeoApiCommune): number | null {
  const population = commune.population ?? null;
  const surfaceHa = commune.surface ?? null;

  if (population === null || surfaceHa === null || surfaceHa <= 0) {
    return null;
  }

  const surfaceKm2 = surfaceHa / 100;
  return population / surfaceKm2;
}

function pushNumericFinding(
  findings: QualityFinding[],
  options: {
    ruleId: string;
    field: string;
    inseeCode: string;
    reference: number;
    actual: number;
    referenceLabel: string;
    actualLabel: string;
    referenceYear?: number | null;
    actualYear?: number | null;
    forceClass?: QualityFinding["class"];
  },
): void {
  const classification = classifyIndicatorDiscrepancy(options.reference, options.actual, {
    referenceYear: options.referenceYear,
    actualYear: options.actualYear,
    referenceSource: options.referenceLabel,
    actualSource: options.actualLabel,
    forceClass: options.forceClass,
  });

  if (classification.severity === "ok") {
    return;
  }

  findings.push({
    ruleId: options.ruleId,
    severity: classification.severity,
    location: `verify:${options.inseeCode}:${options.field}`,
    inseeCode: options.inseeCode,
    class: options.forceClass ?? classification.class,
    message: `${options.field} : ${options.actualLabel} (${options.actual}) ≠ ${options.referenceLabel} (${options.reference}) — écart ${classification.relativeDiffPercent.toFixed(1)} %`,
    expected: options.reference,
    actual: options.actual,
  });
}

function pushExactMatchFinding(
  findings: QualityFinding[],
  options: {
    ruleId: string;
    field: string;
    inseeCode: string;
    reference: number;
    actual: number;
    referenceLabel: string;
    actualLabel: string;
  },
): void {
  if (numbersMatch(options.reference, options.actual)) {
    return;
  }

  findings.push({
    ruleId: options.ruleId,
    severity: "critical",
    location: `verify:${options.inseeCode}:${options.field}`,
    inseeCode: options.inseeCode,
    class: "PARSER_BUG",
    message: `${options.field} : ${options.actualLabel} (${options.actual}) ≠ ${options.referenceLabel} (${options.reference})`,
    expected: options.reference,
    actual: options.actual,
  });
}

export async function verifyReferenceCommune(
  inseeCode: string,
  name: string,
): Promise<QualityFinding[]> {
  const findings: QualityFinding[] = [];
  const territory = await getEnrichedTerritoryByInsee(inseeCode);

  if (!territory) {
    findings.push({
      ruleId: "commune-not-found",
      severity: "critical",
      location: `verify:${inseeCode}`,
      inseeCode,
      class: "JOIN_KEY_ERROR",
      message: `Commune ${name} (${inseeCode}) introuvable via API Géo`,
    });
    return findings;
  }

  const geo = await fetchGeoCommune(inseeCode);
  if (!geo) {
    findings.push({
      ruleId: "geo-not-found",
      severity: "critical",
      location: `verify:${inseeCode}`,
      inseeCode,
      class: "JOIN_KEY_ERROR",
      message: `Référence API Géo introuvable pour ${name} (${inseeCode})`,
    });
    return findings;
  }

  const enrichment = territory.enrichment;
  if (!enrichment) {
    findings.push({
      ruleId: "enrichment-missing",
      severity: "critical",
      location: `verify:${inseeCode}`,
      inseeCode,
      class: "PARSER_BUG",
      message: "Profil enrichi absent",
    });
    return findings;
  }

  if (territory.population !== null && geo.population !== undefined) {
    pushNumericFinding(findings, {
      ruleId: "geo-population",
      field: "population",
      inseeCode,
      reference: geo.population,
      actual: territory.population,
      referenceLabel: "API Géo live",
      actualLabel: "fiche territoire",
    });
  }

  const liveDensity = geoDensity(geo);
  if (liveDensity !== null && territory.densityPerKm2 !== null) {
    pushNumericFinding(findings, {
      ruleId: "geo-density",
      field: "densité",
      inseeCode,
      reference: liveDensity,
      actual: territory.densityPerKm2,
      referenceLabel: "API Géo live (recalculée)",
      actualLabel: "fiche territoire",
    });
  }

  const history = enrichment.populationHistory;
  if (
    history?.available &&
    history.latestPopulation !== null &&
    geo.population !== undefined
  ) {
    pushNumericFinding(findings, {
      ruleId: "population-history-vs-geo",
      field: "population historique vs Géo",
      inseeCode,
      reference: geo.population,
      actual: history.latestPopulation,
      referenceLabel: "API Géo live",
      actualLabel: `historique INSEE ${history.latestYear ?? "?"}`,
      referenceYear: null,
      actualYear: history.latestYear,
    });
  }

  const cachedEnterprises = enrichment.enterprises;
  if (inseeCode === "35238") {
    const enterprises = await fetchEnterpriseSnapshot(inseeCode);
    if (!enterprises) {
      findings.push({
        ruleId: "enterprise-api-unavailable",
        severity: "warning",
        location: `verify:${inseeCode}`,
        inseeCode,
        message:
          "API Recherche Entreprises indisponible (quota ou erreur réseau) — comparaison entreprises ignorée",
      });
    } else if (
      cachedEnterprises &&
      enterprises.legalUnitsWithEstablishment !== null &&
      cachedEnterprises.legalUnitsWithEstablishment !== null
    ) {
      pushNumericFinding(findings, {
        ruleId: "enterprise-total",
        field: "entreprises (unités légales)",
        inseeCode,
        reference: enterprises.legalUnitsWithEstablishment,
        actual: cachedEnterprises.legalUnitsWithEstablishment,
        referenceLabel: "API Recherche Entreprises live",
        actualLabel: "fiche enrichie",
      });
    }
  }

  const bpeCache = loadJsonCache<BpeCommuneCache>("bpe-by-commune.json");
  const bpeEntry = bpeCache?.[inseeCode];
  const equipments = enrichment.equipments;
  if (bpeEntry && equipments?.available) {
    pushExactMatchFinding(findings, {
      ruleId: "bpe-loader",
      field: "équipements BPE total",
      inseeCode,
      reference: bpeEntry.total,
      actual: equipments.totalEquipments,
      referenceLabel: "cache BPE",
      actualLabel: "loader équipements",
    });
  }

  const irveCache = loadJsonCache<IrveCommuneCache>("irve-by-commune.json");
  const irveEntry = irveCache?.[inseeCode];
  const mobility = enrichment.mobility;
  if (irveEntry && mobility?.irve.available) {
    pushExactMatchFinding(findings, {
      ruleId: "irve-loader",
      field: "points IRVE",
      inseeCode,
      reference: irveEntry.chargingPoints,
      actual: mobility.irve.chargingPoints,
      referenceLabel: "cache IRVE",
      actualLabel: "loader mobilité",
    });
  }

  const propertyCache = loadJsonCache<PropertyCommuneCache>(
    "property-by-commune.json",
  );
  const propertyEntry = propertyCache?.[inseeCode];
  const property = enrichment.property;
  const propertyPrice = property?.averagePricePerM2 ?? null;
  const cachePrice = propertyEntry?.averagePricePerM2 ?? null;
  if (cachePrice !== null && propertyPrice !== null && property) {
    pushNumericFinding(findings, {
      ruleId: "dvf-loader",
      field: "prix m² DVF",
      inseeCode,
      reference: cachePrice,
      actual: propertyPrice,
      referenceLabel: "cache DVF",
      actualLabel: "loader immobilier",
      referenceYear: propertyEntry?.year,
      actualYear: property.year,
    });
  }

  const recomputedDerived = computeDerivedIndicators(territory, enrichment);
  const storedDerived = enrichment.derived;
  if (recomputedDerived.available && storedDerived?.available) {
    const derivedChecks: Array<{
      field: string;
      reference: number | null;
      actual: number | null;
    }> = [
      {
        field: "équipements / 1 000 hab.",
        reference: recomputedDerived.equipmentsPer1000Residents,
        actual: storedDerived.equipmentsPer1000Residents,
      },
      {
        field: "IRVE / 1 000 hab.",
        reference: recomputedDerived.irvePointsPer1000Residents,
        actual: storedDerived.irvePointsPer1000Residents,
      },
      {
        field: "croissance population %",
        reference: recomputedDerived.populationGrowthPercent,
        actual: storedDerived.populationGrowthPercent,
      },
    ];

    for (const check of derivedChecks) {
      if (check.reference !== null && check.actual !== null) {
        pushNumericFinding(findings, {
          ruleId: "derived-indicator",
          field: check.field,
          inseeCode,
          reference: check.reference,
          actual: check.actual,
          referenceLabel: "recalcul derived.ts",
          actualLabel: "enrichment.derived",
          forceClass: "PARSER_BUG",
        });
      }
    }
  }

  return findings;
}

export async function verifyGoldenCommunes(): Promise<QualityFinding[]> {
  const findings: QualityFinding[] = [];

  for (const commune of GOLDEN_COMMUNES) {
    console.log(`  Vérification ${commune.name} (${commune.inseeCode})…`);
    const communeFindings = await verifyReferenceCommune(
      commune.inseeCode,
      commune.name,
    );
    findings.push(...communeFindings);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return findings;
}
