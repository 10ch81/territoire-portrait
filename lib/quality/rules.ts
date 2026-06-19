import { loadJsonCache } from "../enrichment/cache";
import type {
  ArcepCommuneCache,
  BpeCommuneCache,
  FiscalCommuneCache,
  FloresCommuneCache,
  HousingCommuneCache,
  LovacCommuneCache,
  IrveCommuneCache,
  PopulationCommuneCache,
  PropertyCommuneCache,
  SociodemographicsCommuneCache,
} from "../types";
import type { QualityFinding } from "./types";

const PERCENT_TOLERANCE = 0.5;
const COUNT_TOLERANCE = 1;

function sumRecordValues(record: Record<string, number>): number {
  return Object.values(record).reduce((acc, value) => acc + value, 0);
}

function isPercentInRange(
  value: number | null | undefined,
  field: string,
  inseeCode: string,
): QualityFinding | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value < 0 || value > 100) {
    return {
      ruleId: "bounds-percent",
      severity: "critical",
      location: `cache:${inseeCode}`,
      inseeCode,
      message: `${field} hors bornes [0, 100] : ${value}`,
      actual: value,
    };
  }

  return null;
}

function validateBpeCache(findings: QualityFinding[]): void {
  const cache = loadJsonCache<BpeCommuneCache>("bpe-by-commune.json");

  if (!cache) {
    findings.push({
      ruleId: "cache-missing",
      severity: "warning",
      location: "data/cache/bpe-by-commune.json",
      message: "Cache BPE absent — exécutez npm run ingest:bpe",
    });
    return;
  }

  for (const [inseeCode, entry] of Object.entries(cache)) {
    if (entry.total < 0) {
      findings.push({
        ruleId: "bpe-negative-total",
        severity: "critical",
        location: `bpe-by-commune.json:${inseeCode}`,
        inseeCode,
        message: "Total BPE négatif",
        actual: entry.total,
      });
    }

    const domainSum = sumRecordValues(entry.byDomain);
    const typeSum = sumRecordValues(entry.byType ?? {});

    for (const [domain, count] of Object.entries(entry.byDomain)) {
      if (count < 0) {
        findings.push({
          ruleId: "bpe-negative-domain",
          severity: "critical",
          location: `bpe-by-commune.json:${inseeCode}`,
          inseeCode,
          message: `Domaine BPE ${domain} négatif : ${count}`,
          actual: count,
        });
      }
    }

    if (entry.total > 0 && domainSum === 0 && typeSum === 0) {
      findings.push({
        ruleId: "bpe-empty-breakdown",
        severity: "critical",
        location: `bpe-by-commune.json:${inseeCode}`,
        inseeCode,
        class: "JOIN_KEY_ERROR",
        message: "Total BPE positif sans détail par domaine ni par type",
        actual: entry.total,
      });
    }
  }
}

function validateHousingCache(findings: QualityFinding[]): void {
  const cache = loadJsonCache<HousingCommuneCache>("housing-by-commune.json");

  if (!cache) {
    findings.push({
      ruleId: "cache-missing",
      severity: "warning",
      location: "data/cache/housing-by-commune.json",
      message: "Cache RPLS absent — exécutez npm run ingest:housing",
    });
    return;
  }

  for (const [inseeCode, entry] of Object.entries(cache)) {
    if (entry.totalUnits < 0 || entry.occupiedUnits < 0 || entry.vacantUnits < 0) {
      findings.push({
        ruleId: "housing-negative",
        severity: "critical",
        location: `housing-by-commune.json:${inseeCode}`,
        inseeCode,
        message: "Valeurs RPLS négatives",
      });
    }

    const unitSum = entry.occupiedUnits + entry.vacantUnits;
    if (entry.totalUnits > 0 && unitSum > entry.totalUnits + COUNT_TOLERANCE) {
      findings.push({
        ruleId: "housing-unit-sum-exceeds",
        severity: "warning",
        location: `housing-by-commune.json:${inseeCode}`,
        inseeCode,
        class: "DEFINITION_DIFF",
        message: `Occupés + vacants (${unitSum}) > total logements (${entry.totalUnits}) — incohérence source RPLS`,
        expected: entry.totalUnits,
        actual: unitSum,
      });
    }

    if (entry.totalUnits > 0 && unitSum <= entry.totalUnits + COUNT_TOLERANCE) {
      const vacancyRate = (entry.vacantUnits / entry.totalUnits) * 100;
      const vacancyFinding = isPercentInRange(
        vacancyRate,
        "taux de vacance RPLS",
        inseeCode,
      );
      if (vacancyFinding) {
        findings.push(vacancyFinding);
      }
    }

    if (entry.totalDwellings !== null && entry.totalDwellings > 0) {
      const share = (entry.totalUnits / entry.totalDwellings) * 100;
      if (share > 100 + PERCENT_TOLERANCE) {
        findings.push({
          ruleId: "housing-share-exceeds-parc",
          severity: "warning",
          location: `housing-by-commune.json:${inseeCode}`,
          inseeCode,
          class: "DEFINITION_DIFF",
          message: `Part logements sociaux > 100 % (${share.toFixed(1)} %) — périmètres RP / RPLS divergents`,
          expected: 100,
          actual: share,
        });
      } else {
        const shareFinding = isPercentInRange(
          share,
          "part logements sociaux",
          inseeCode,
        );
        if (shareFinding) {
          findings.push(shareFinding);
        }
      }
    }
  }
}

function validatePopulationCache(findings: QualityFinding[]): void {
  const cache = loadJsonCache<PopulationCommuneCache>("population-by-commune.json");

  if (!cache) {
    findings.push({
      ruleId: "cache-missing",
      severity: "warning",
      location: "data/cache/population-by-commune.json",
      message: "Cache population absent — exécutez npm run ingest:population",
    });
    return;
  }

  for (const [inseeCode, entry] of Object.entries(cache)) {
    for (const [yearRaw, population] of Object.entries(entry.history)) {
      const year = Number.parseInt(yearRaw, 10);
      if (Number.isNaN(year) || year < 1900 || year > 2100) {
        findings.push({
          ruleId: "population-invalid-year",
          severity: "critical",
          location: `population-by-commune.json:${inseeCode}`,
          inseeCode,
          message: `Année population invalide : ${yearRaw}`,
        });
      }

      if (population < 0) {
        findings.push({
          ruleId: "population-negative",
          severity: "critical",
          location: `population-by-commune.json:${inseeCode}`,
          inseeCode,
          message: `Population négative en ${yearRaw} : ${population}`,
          actual: population,
        });
      }
    }
  }
}

function validateIrveCache(findings: QualityFinding[]): void {
  const cache = loadJsonCache<IrveCommuneCache>("irve-by-commune.json");

  if (!cache) {
    findings.push({
      ruleId: "cache-missing",
      severity: "warning",
      location: "data/cache/irve-by-commune.json",
      message: "Cache IRVE absent — exécutez npm run ingest:irve",
    });
    return;
  }

  for (const [inseeCode, entry] of Object.entries(cache)) {
    if (entry.chargingPoints < 0 || entry.stations < 0) {
      findings.push({
        ruleId: "irve-negative",
        severity: "critical",
        location: `irve-by-commune.json:${inseeCode}`,
        inseeCode,
        message: "Compteurs IRVE négatifs",
      });
    }

    if (entry.stations > entry.chargingPoints) {
      findings.push({
        ruleId: "irve-stations-exceed-points",
        severity: "warning",
        location: `irve-by-commune.json:${inseeCode}`,
        inseeCode,
        message: `Stations IRVE (${entry.stations}) > points (${entry.chargingPoints})`,
        expected: entry.chargingPoints,
        actual: entry.stations,
      });
    }
  }
}

function validatePropertyCache(findings: QualityFinding[]): void {
  const cache = loadJsonCache<PropertyCommuneCache>("property-by-commune.json");

  if (!cache) {
    findings.push({
      ruleId: "cache-missing",
      severity: "warning",
      location: "data/cache/property-by-commune.json",
      message: "Cache DVF absent — exécutez npm run ingest:property",
    });
    return;
  }

  for (const [inseeCode, entry] of Object.entries(cache)) {
    const houseFinding = isPercentInRange(
      entry.houseSharePercent,
      "part maisons DVF",
      inseeCode,
    );
    if (houseFinding) {
      findings.push(houseFinding);
    }

    const apartmentFinding = isPercentInRange(
      entry.apartmentSharePercent,
      "part appartements DVF",
      inseeCode,
    );
    if (apartmentFinding) {
      findings.push(apartmentFinding);
    }

    if (
      entry.houseSharePercent !== null &&
      entry.apartmentSharePercent !== null
    ) {
      const shareSum = entry.houseSharePercent + entry.apartmentSharePercent;
      if (Math.abs(shareSum - 100) > PERCENT_TOLERANCE) {
        findings.push({
          ruleId: "property-share-sum",
          severity: "warning",
          location: `property-by-commune.json:${inseeCode}`,
          inseeCode,
          message: `Parts maisons + appartements = ${shareSum} % (attendu ~100 %)`,
          expected: 100,
          actual: shareSum,
        });
      }
    }

    if (entry.averagePricePerM2 !== null && entry.averagePricePerM2 < 0) {
      findings.push({
        ruleId: "property-negative-price",
        severity: "critical",
        location: `property-by-commune.json:${inseeCode}`,
        inseeCode,
        message: "Prix m² DVF négatif",
        actual: entry.averagePricePerM2,
      });
    }
  }
}

function validateSocialCache(findings: QualityFinding[]): void {
  const cache = loadJsonCache<SociodemographicsCommuneCache>(
    "social-by-commune.json",
  );

  if (!cache) {
    findings.push({
      ruleId: "cache-missing",
      severity: "warning",
      location: "data/cache/social-by-commune.json",
      message: "Cache socio-démographie absent — exécutez npm run ingest:social",
    });
    return;
  }

  for (const [inseeCode, entry] of Object.entries(cache)) {
    const unemploymentFinding = isPercentInRange(
      entry.unemploymentRate,
      "taux de chômage",
      inseeCode,
    );
    if (unemploymentFinding) {
      findings.push(unemploymentFinding);
    }

    for (const [band, population] of Object.entries(entry.ageBands)) {
      if (population < 0) {
        findings.push({
          ruleId: "social-negative-age-band",
          severity: "critical",
          location: `social-by-commune.json:${inseeCode}`,
          inseeCode,
          message: `Tranche d'âge ${band} négative : ${population}`,
          actual: population,
        });
      }
    }
  }
}

function validateFiscalCache(findings: QualityFinding[]): void {
  const cache = loadJsonCache<FiscalCommuneCache>("fiscal-by-commune.json");

  if (!cache) {
    findings.push({
      ruleId: "cache-missing",
      severity: "warning",
      location: "data/cache/fiscal-by-commune.json",
      message: "Cache REI absent — exécutez npm run ingest:rei",
    });
    return;
  }

  for (const [inseeCode, entry] of Object.entries(cache)) {
    for (const [field, value] of Object.entries({
      propertyTaxBuiltRate: entry.propertyTaxBuiltRate,
      propertyTaxUnbuiltRate: entry.propertyTaxUnbuiltRate,
      habitationTaxRate: entry.habitationTaxRate,
    })) {
      if (value !== null && value < 0) {
        findings.push({
          ruleId: "fiscal-negative-rate",
          severity: "critical",
          location: `fiscal-by-commune.json:${inseeCode}`,
          inseeCode,
          message: `Taux fiscal ${field} négatif : ${value}`,
          actual: value,
        });
      }
    }
  }
}

function validateFloresCache(findings: QualityFinding[]): void {
  const cache = loadJsonCache<FloresCommuneCache>("flores-by-commune.json");

  if (!cache) {
    findings.push({
      ruleId: "cache-missing",
      severity: "warning",
      location: "data/cache/flores-by-commune.json",
      message: "Cache FLORES absent — exécutez npm run ingest:flores",
    });
    return;
  }

  for (const [inseeCode, entry] of Object.entries(cache)) {
    if (entry.totalEstablishments < 0 || entry.totalSalariedPosts < 0) {
      findings.push({
        ruleId: "flores-negative-total",
        severity: "critical",
        location: `flores-by-commune.json:${inseeCode}`,
        inseeCode,
        message: "Totaux FLORES négatifs",
      });
    }
  }
}

function validateLovacCache(findings: QualityFinding[]): void {
  const cache = loadJsonCache<LovacCommuneCache>("lovac-by-commune.json");

  if (!cache) {
    findings.push({
      ruleId: "cache-missing",
      severity: "warning",
      location: "data/cache/lovac-by-commune.json",
      message: "Cache LOVAC absent — exécutez npm run ingest:lovac",
    });
    return;
  }

  for (const [inseeCode, entry] of Object.entries(cache)) {
    if (
      entry.privateVacantDwellings !== null &&
      entry.privateVacantDwellings < 0
    ) {
      findings.push({
        ruleId: "lovac-negative",
        severity: "critical",
        location: `lovac-by-commune.json:${inseeCode}`,
        inseeCode,
        message: "Valeur LOVAC négative (logements vacants parc privé)",
      });
    }

    const percentFinding = isPercentInRange(
      entry.privateVacancyRatePercent,
      "taux vacance parc privé LOVAC",
      inseeCode,
    );
    if (percentFinding) {
      findings.push(percentFinding);
    }

    if (
      entry.privateVacantStructural !== null &&
      entry.privateVacantDwellings !== null &&
      entry.privateVacantStructural > entry.privateVacantDwellings + COUNT_TOLERANCE
    ) {
      findings.push({
        ruleId: "lovac-structural-exceeds-total",
        severity: "warning",
        location: `lovac-by-commune.json:${inseeCode}`,
        inseeCode,
        message:
          "Vacance structurelle LOVAC supérieure au total des vacants parc privé",
      });
    }
  }
}

function validateArcepCache(findings: QualityFinding[]): void {
  const cache = loadJsonCache<ArcepCommuneCache>("arcep-by-commune.json");

  if (!cache) {
    findings.push({
      ruleId: "cache-missing",
      severity: "warning",
      location: "data/cache/arcep-by-commune.json",
      message: "Cache ARCEP absent — exécutez npm run ingest:fibre",
    });
    return;
  }

  for (const [inseeCode, entry] of Object.entries(cache)) {
    const percentFinding = isPercentInRange(
      entry.fiberEligibleSharePercent,
      "fiberEligibleSharePercent",
      inseeCode,
    );
    if (percentFinding) {
      findings.push(percentFinding);
    }
  }
}

export function validateInternalCache(): QualityFinding[] {
  const findings: QualityFinding[] = [];

  validateBpeCache(findings);
  validateHousingCache(findings);
  validateLovacCache(findings);
  validatePopulationCache(findings);
  validateIrveCache(findings);
  validatePropertyCache(findings);
  validateSocialCache(findings);
  validateFiscalCache(findings);
  validateFloresCache(findings);
  validateArcepCache(findings);

  return findings;
}
