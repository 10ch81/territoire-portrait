/** Résultat d'une vérification de millésime (phase 1 — découverte). */
export type SourceVintageStatus =
  | "current"
  | "update_available"
  | "discovery_failed";

export interface SourceVintageCheckResult {
  id: string;
  label: string;
  supportedVintage: number;
  discoveredVintage: number | null;
  status: SourceVintageStatus;
  discoveryMethod: string;
  referenceUrl: string;
  ingestScript: string;
  adoptionHint: string;
  detail?: string;
}

const YEAR_PATTERN = /\b(20\d{2})\b/g;

export function extractYearsFromText(text: string): number[] {
  const years = new Set<number>();
  for (const match of text.matchAll(YEAR_PATTERN)) {
    const year = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(year) && year >= 2010 && year <= 2100) {
      years.add(year);
    }
  }
  return [...years];
}

export function extractFilosofiVintageYears(html: string): number[] {
  const years = new Set<number>();
  const patterns = [
    /Revenus localisés sociaux et fiscaux[^<\n]{0,40}(\d{4})/gi,
    /Filosofi[^<\n]{0,40}(\d{4})/gi,
    /FILOSOFI[^<\n]{0,40}_(\d{4})/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const year = Number.parseInt(match[1] ?? "", 10);
      if (Number.isFinite(year) && year >= 2010 && year <= 2100) {
        years.add(year);
      }
    }
  }

  return [...years];
}

export function maxYear(years: number[]): number | null {
  if (years.length === 0) {
    return null;
  }
  return Math.max(...years);
}

/** Millésimes FILOSOFI listés sur la page série INSEE (hors dates de publication). */
export async function discoverFilosofiVintageOnSeriePage(
  pageUrl: string,
): Promise<number | null> {
  const html = await fetchText(pageUrl);
  if (!html) {
    return null;
  }
  return maxYear(extractFilosofiVintageYears(html));
}

/** Remplace la première occurrence `_YYYY_` (Melodi / fichiers INSEE). */
export function replaceEmbeddedYear(url: string, year: number): string {
  return url.replace(/_(\d{4})_/i, `_${year}_`);
}

/** Remplace `-YYYY_csv` dans les archives INSEE communales. */
export function replaceInseeCommunalYear(url: string, year: number): string {
  return url.replace(/-(\d{4})_csv/i, `-${year}_csv`);
}

export async function probeUrlExists(url: string): Promise<boolean> {
  try {
    const headResponse = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });

    if (headResponse.ok) {
      const contentType = headResponse.headers.get("content-type") ?? "";
      if (
        contentType.includes("text/html") &&
        !url.endsWith(".html") &&
        !url.includes("/fr/statistiques/")
      ) {
        return false;
      }
      return true;
    }

    if (headResponse.status === 405 || headResponse.status === 403) {
      const getResponse = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      if (!getResponse.ok && getResponse.status !== 206) {
        return false;
      }
      const contentType = getResponse.headers.get("content-type") ?? "";
      if (contentType.includes("text/html") && !url.endsWith(".html")) {
        return false;
      }
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

/** Sonde les millésimes successifs sur une URL à année embarquée (Melodi, INSEE fichier). */
export async function discoverSuccessorYearInUrl(
  fileUrl: string,
  supportedYear: number,
  replaceYear: (url: string, year: number) => string,
  maxProbe = 3,
): Promise<number | null> {
  const firstCandidate = replaceYear(fileUrl, supportedYear + 1);
  if (firstCandidate === fileUrl) {
    return null;
  }

  let latest = supportedYear;

  for (let offset = 1; offset <= maxProbe; offset += 1) {
    const candidateYear = supportedYear + offset;
    const candidateUrl = replaceYear(fileUrl, candidateYear);
    if (candidateUrl === fileUrl) {
      break;
    }
    if (await probeUrlExists(candidateUrl)) {
      latest = candidateYear;
    }
  }

  return latest;
}

/** Extrait le millésime le plus élevé mentionné sur une page INSEE (titres + liens). */
export async function discoverMaxYearOnInseePage(pageUrl: string): Promise<number | null> {
  const html = await fetchText(pageUrl);
  if (!html) {
    return null;
  }
  return maxYear(extractYearsFromText(html));
}

export function buildSourceVintageResult(
  input: Omit<SourceVintageCheckResult, "status"> & {
    status?: SourceVintageStatus;
  },
): SourceVintageCheckResult {
  let status = input.status;
  if (!status) {
    if (input.discoveredVintage === null) {
      status = "discovery_failed";
    } else if (input.discoveredVintage > input.supportedVintage) {
      status = "update_available";
    } else {
      status = "current";
    }
  }

  return { ...input, status };
}
