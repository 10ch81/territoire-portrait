import {
  BPE_MMELODI_FILE_URL,
  FILOSOFI_FILE_URL,
  FILOSOFI_VINTAGE,
  FLORES_MMELODI_FILE_URL,
  RP_COMMUTE_FILE_URL,
  RP_EMPLOYMENT_FILE_URL,
  RP_HOUSING_FILE_URL,
  RP_POPULATION_FILE_URL,
  RP_VINTAGE,
  RPLS_VINTAGE,
  TOURISM_FILE_URL,
} from "./sources";
import {
  buildSourceVintageResult,
  discoverFilosofiVintageOnSeriePage,
  discoverMaxYearOnInseePage,
  discoverSuccessorYearInUrl,
  probeUrlExists,
  replaceEmbeddedYear,
  replaceInseeCommunalYear,
  type SourceVintageCheckResult,
} from "./source-vintage-discovery";

const FILOSOFI_SERIE_PAGE_URL =
  "https://www.insee.fr/fr/metadonnees/source/serie/s1172";

const RPLS_FILE_URL =
  "https://static.data.gouv.fr/resources/repertoire-des-logements-locatifs-des-bailleurs-sociaux-rpls-2021/20230309-150841/rpls-2021.csv";

const REI_FILE_URL =
  "https://data.economie.gouv.fr/api/v2/catalog/datasets/impots-locaux-fichier-de-recensement-des-elements-dimposition-a-la-fiscalite-dir/attachments/rei_2024_fichier_notice_trace_zip";

const DVF_LATEST_FILE_URL =
  "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2024/20250707-085855/communesdvf2024.csv";

const ADOPTION_HINT =
  "Phase 2 : mettre à jour *_VINTAGE et URLs dans lib/sources.ts, adapter le parser si le schéma change, puis npm run ingest:<script> && npm run quality:all.";

export const SUPPORTED_VINTAGE_ADOPTION_WORKFLOW = ADOPTION_HINT;

function formatAdoptionHint(ingestScript: string): string {
  const npmScript = ingestScript
    .replace(/^scripts\//, "")
    .replace(/^ingest-/, "")
    .replace(/\.ts$/, "");
  return ADOPTION_HINT.replace("<script>", npmScript);
}

interface SourceVintageDefinition {
  id: string;
  label: string;
  supportedVintage: number;
  ingestScript: string;
  referenceUrl: string;
  discoveryMethod: string;
  discoverLatestVintage: () => Promise<number | null>;
}

function yearFromMelodiUrl(url: string): number {
  const match = url.match(/_(\d{4})_/i);
  if (!match) {
    throw new Error(`Impossible d'extraire le millésime Melodi : ${url}`);
  }
  return Number.parseInt(match[1] ?? "", 10);
}

function yearFromRplsUrl(url: string): number {
  const match = url.match(/rpls-(\d{4})\.csv/i);
  if (!match) {
    throw new Error(`Impossible d'extraire le millésime RPLS : ${url}`);
  }
  return Number.parseInt(match[1] ?? "", 10);
}

function yearFromReiUrl(url: string): number {
  const match = url.match(/rei_(\d{4})_/i);
  if (!match) {
    throw new Error(`Impossible d'extraire le millésime REI : ${url}`);
  }
  return Number.parseInt(match[1] ?? "", 10);
}

function yearFromDvfUrl(url: string): number {
  const match = url.match(/communesdvf(\d{4})\.csv/i);
  if (!match) {
    throw new Error(`Impossible d'extraire le millésime DVF : ${url}`);
  }
  return Number.parseInt(match[1] ?? "", 10);
}

const SOURCE_VINTAGE_DEFINITIONS: SourceVintageDefinition[] = [
  {
    id: "rp-population",
    label: "INSEE — RP structure par âge",
    supportedVintage: RP_VINTAGE,
    ingestScript: "ingest-social.ts",
    referenceUrl: RP_POPULATION_FILE_URL,
    discoveryMethod: "sonde URL fichier INSEE (-YYYY_csv)",
    discoverLatestVintage: async () =>
      discoverSuccessorYearInUrl(
        RP_POPULATION_FILE_URL,
        RP_VINTAGE,
        replaceInseeCommunalYear,
      ),
  },
  {
    id: "rp-employment",
    label: "INSEE — RP emploi / chômage",
    supportedVintage: RP_VINTAGE,
    ingestScript: "ingest-social.ts",
    referenceUrl: RP_EMPLOYMENT_FILE_URL,
    discoveryMethod: "sonde URL fichier INSEE (-YYYY_csv)",
    discoverLatestVintage: async () =>
      discoverSuccessorYearInUrl(
        RP_EMPLOYMENT_FILE_URL,
        RP_VINTAGE,
        replaceInseeCommunalYear,
      ),
  },
  {
    id: "rp-housing",
    label: "INSEE — RP logement",
    supportedVintage: RP_VINTAGE,
    ingestScript: "ingest-housing.ts",
    referenceUrl: RP_HOUSING_FILE_URL,
    discoveryMethod: "sonde URL fichier INSEE (-YYYY_csv)",
    discoverLatestVintage: async () =>
      discoverSuccessorYearInUrl(
        RP_HOUSING_FILE_URL,
        RP_VINTAGE,
        replaceInseeCommunalYear,
      ),
  },
  {
    id: "rp-commute",
    label: "INSEE — RP mobilité domicile-travail",
    supportedVintage: RP_VINTAGE,
    ingestScript: "ingest-commute.ts",
    referenceUrl: RP_COMMUTE_FILE_URL,
    discoveryMethod: "sonde URL fichier INSEE (-YYYY_csv)",
    discoverLatestVintage: async () =>
      discoverSuccessorYearInUrl(
        RP_COMMUTE_FILE_URL,
        RP_VINTAGE,
        replaceEmbeddedYear,
      ),
  },
  {
    id: "filosofi",
    label: "INSEE — FILOSOFI (revenus)",
    supportedVintage: FILOSOFI_VINTAGE,
    ingestScript: "ingest-social.ts",
    referenceUrl: FILOSOFI_FILE_URL,
    discoveryMethod: "page série INSEE + sonde URL fichier",
    discoverLatestVintage: async () => {
      const fromPage = await discoverFilosofiVintageOnSeriePage(FILOSOFI_SERIE_PAGE_URL);
      const fromUrl = await discoverSuccessorYearInUrl(
        FILOSOFI_FILE_URL,
        FILOSOFI_VINTAGE,
        replaceEmbeddedYear,
      );
      const candidates = [fromPage, fromUrl].filter(
        (year): year is number => year !== null,
      );
      return candidates.length > 0 ? Math.max(...candidates) : null;
    },
  },
  {
    id: "bpe",
    label: "INSEE — BPE",
    supportedVintage: yearFromMelodiUrl(BPE_MMELODI_FILE_URL),
    ingestScript: "ingest-bpe.ts",
    referenceUrl: BPE_MMELODI_FILE_URL,
    discoveryMethod: "sonde URL Melodi (_YYYY_)",
    discoverLatestVintage: async () =>
      discoverSuccessorYearInUrl(
        BPE_MMELODI_FILE_URL,
        yearFromMelodiUrl(BPE_MMELODI_FILE_URL),
        replaceEmbeddedYear,
      ),
  },
  {
    id: "flores",
    label: "INSEE — FLORES A17",
    supportedVintage: yearFromMelodiUrl(FLORES_MMELODI_FILE_URL),
    ingestScript: "ingest-flores.ts",
    referenceUrl: FLORES_MMELODI_FILE_URL,
    discoveryMethod: "sonde URL Melodi (_YYYY_)",
    discoverLatestVintage: async () =>
      discoverSuccessorYearInUrl(
        FLORES_MMELODI_FILE_URL,
        yearFromMelodiUrl(FLORES_MMELODI_FILE_URL),
        replaceEmbeddedYear,
      ),
  },
  {
    id: "tourism",
    label: "INSEE — capacités touristiques",
    supportedVintage: yearFromMelodiUrl(TOURISM_FILE_URL),
    ingestScript: "ingest-tourism.ts",
    referenceUrl: TOURISM_FILE_URL,
    discoveryMethod: "sonde URL Melodi (_YYYY_)",
    discoverLatestVintage: async () => {
      const supported = yearFromMelodiUrl(TOURISM_FILE_URL);
      return discoverSuccessorYearInUrl(
        TOURISM_FILE_URL,
        supported,
        replaceEmbeddedYear,
      );
    },
  },
  {
    id: "rpls",
    label: "RPLS — logements sociaux",
    supportedVintage: RPLS_VINTAGE,
    ingestScript: "ingest-housing.ts",
    referenceUrl: RPLS_FILE_URL,
    discoveryMethod: "sonde URL data.gouv (rpls-YYYY.csv)",
    discoverLatestVintage: async () => {
      let latest = RPLS_VINTAGE;
      for (let year = RPLS_VINTAGE + 1; year <= RPLS_VINTAGE + 3; year += 1) {
        const candidate = RPLS_FILE_URL.replace(
          /rpls-\d{4}\.csv/i,
          `rpls-${year}.csv`,
        );
        if (await probeUrlExists(candidate)) {
          latest = year;
        }
      }
      return latest;
    },
  },
  {
    id: "rei",
    label: "REI — fiscalité locale",
    supportedVintage: yearFromReiUrl(REI_FILE_URL),
    ingestScript: "ingest-rei.ts",
    referenceUrl: REI_FILE_URL,
    discoveryMethod: "sonde URL DGFiP (rei_YYYY_)",
    discoverLatestVintage: async () => {
      const supported = yearFromReiUrl(REI_FILE_URL);
      let latest = supported;
      for (let year = supported + 1; year <= supported + 2; year += 1) {
        const candidate = REI_FILE_URL.replace(
          /rei_\d{4}_/i,
          `rei_${year}_`,
        );
        if (await probeUrlExists(candidate)) {
          latest = year;
        }
      }
      return latest;
    },
  },
  {
    id: "dvf",
    label: "DVF — indicateurs agrégés commune",
    supportedVintage: yearFromDvfUrl(DVF_LATEST_FILE_URL),
    ingestScript: "ingest-property.ts",
    referenceUrl: DVF_LATEST_FILE_URL,
    discoveryMethod: "sonde URL data.gouv (communesdvfYYYY.csv)",
    discoverLatestVintage: async () => {
      const supported = yearFromDvfUrl(DVF_LATEST_FILE_URL);
      let latest = supported;
      for (let year = supported + 1; year <= supported + 1; year += 1) {
        const candidate = DVF_LATEST_FILE_URL.replace(
          /communesdvf\d{4}\.csv/i,
          `communesdvf${year}.csv`,
        );
        if (await probeUrlExists(candidate)) {
          latest = year;
        }
      }
      return latest;
    },
  },
];

export interface SourceVintageReport {
  generatedAt: string;
  adoptionWorkflow: string;
  checks: SourceVintageCheckResult[];
  summary: {
    current: number;
    updateAvailable: number;
    discoveryFailed: number;
  };
}

export async function checkSourceVintages(): Promise<SourceVintageReport> {
  const checks: SourceVintageCheckResult[] = [];

  for (const definition of SOURCE_VINTAGE_DEFINITIONS) {
    let discoveredVintage: number | null = null;
    let detail: string | undefined;

    try {
      discoveredVintage = await definition.discoverLatestVintage();
    } catch (error) {
      detail =
        error instanceof Error ? error.message : "Erreur de découverte inconnue.";
    }

    checks.push(
      buildSourceVintageResult({
        id: definition.id,
        label: definition.label,
        supportedVintage: definition.supportedVintage,
        discoveredVintage,
        discoveryMethod: definition.discoveryMethod,
        referenceUrl: definition.referenceUrl,
        ingestScript: definition.ingestScript,
        adoptionHint: formatAdoptionHint(definition.ingestScript),
        detail,
      }),
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    adoptionWorkflow: ADOPTION_HINT,
    checks,
    summary: {
      current: checks.filter((check) => check.status === "current").length,
      updateAvailable: checks.filter((check) => check.status === "update_available")
        .length,
      discoveryFailed: checks.filter((check) => check.status === "discovery_failed")
        .length,
    },
  };
}

export function formatSourceVintageReport(report: SourceVintageReport): string {
  const lines = [
    "Vérification des millésimes sources (phase 1 — découverte)",
    `Généré : ${report.generatedAt}`,
    "",
    "ID | Supporté | Découvert | Statut | Source",
    "---|----------|-----------|--------|-------",
  ];

  for (const check of report.checks) {
    const discovered =
      check.discoveredVintage === null ? "—" : String(check.discoveredVintage);
    lines.push(
      `${check.id} | ${check.supportedVintage} | ${discovered} | ${check.status} | ${check.label}`,
    );
    if (check.status === "update_available") {
      lines.push(
        `  → Adoption : ${check.adoptionHint}`,
      );
    }
    if (check.detail) {
      lines.push(`  → Détail : ${check.detail}`);
    }
  }

  lines.push("");
  lines.push(
    `Résumé : ${report.summary.current} à jour, ${report.summary.updateAvailable} mise(s) à jour disponible(s), ${report.summary.discoveryFailed} échec(s) de découverte.`,
  );
  lines.push("");
  lines.push(`Workflow phase 2 : ${report.adoptionWorkflow}`);

  return lines.join("\n");
}
