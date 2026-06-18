import { createReadStream, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  CACHE_DIR,
  downloadFile,
  extractZip,
  parseCsvLine,
} from "./ingest-utils";
import type { PublicTransportCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "public-transport-by-commune.json");
const GEOCODE_CACHE_PATH = resolve(CACHE_DIR, "gtfs-geocode-cache.json");
const TEMP_ROOT = resolve(CACHE_DIR, "gtfs-ingest-temp");

interface TransportResource {
  format?: string;
  url?: string;
  original_url?: string;
  is_available?: boolean;
  metadata?: { features?: { stops?: boolean } };
}

interface CoveredArea {
  type?: string;
  insee?: string;
}

interface TransportDataset {
  title: string;
  covered_area?: CoveredArea[];
  resources?: TransportResource[];
  offers?: Array<{ type_transport?: string }>;
}

const BLOCKED_TITLE_KEYWORDS = [
  "européen",
  "europeen",
  "renfe",
  "eurostar",
  "flix",
  "blablabus",
  "thello",
  "trenitalia",
  "covoiturage",
];

function isEligibleGtfsDataset(dataset: TransportDataset): boolean {
  const title = dataset.title.toLowerCase();
  if (BLOCKED_TITLE_KEYWORDS.some((keyword) => title.includes(keyword))) {
    return false;
  }

  if ((dataset.offers?.length ?? 0) === 0) {
    return false;
  }

  return isFrenchTerritorialDataset(dataset);
}

type GeocodeCache = Record<string, string | null>;

interface CommuneAccumulator {
  stopLocations: Set<string>;
  feedIds: Set<string>;
}

function isFrenchTerritorialDataset(dataset: TransportDataset): boolean {
  return (dataset.covered_area ?? []).some((area) => {
    const type = area.type ?? "";
    const insee = area.insee ?? "";
    return (
      (type === "pays" && insee === "FR") ||
      (type === "region" && /^\d{2,3}$/.test(insee)) ||
      (type === "departement" && /^(?:\d{2,3}|2A|2B)$/.test(insee))
    );
  });
}

async function collectGtfsUrls(): Promise<string[]> {
  const urls = new Set<string>();
  let page = 1;

  while (page <= 50) {
    const response = await fetch(
      `https://transport.data.gouv.fr/api/datasets?page=${page}&page_size=100`,
    );
    if (!response.ok) {
      throw new Error(`API transport.data.gouv.fr indisponible (${response.status}).`);
    }

    const datasets = (await response.json()) as TransportDataset[];
    if (!Array.isArray(datasets) || datasets.length === 0) {
      break;
    }

    for (const dataset of datasets) {
      if (!isEligibleGtfsDataset(dataset)) {
        continue;
      }

      for (const resource of dataset.resources ?? []) {
        if (
          (resource.format ?? "").toUpperCase() === "GTFS" &&
          resource.is_available !== false &&
          resource.metadata?.features?.stops !== false
        ) {
          const key = resource.original_url ?? resource.url;
          if (key) {
            urls.add(key);
          }
        }
      }
    }

    page += 1;
  }

  return [...urls];
}

function loadGeocodeCache(): GeocodeCache {
  if (!existsSync(GEOCODE_CACHE_PATH)) {
    return {};
  }

  return JSON.parse(readFileSync(GEOCODE_CACHE_PATH, "utf8")) as GeocodeCache;
}

function saveGeocodeCache(cache: GeocodeCache): void {
  writeFileSync(GEOCODE_CACHE_PATH, JSON.stringify(cache));
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const response = await fetch(
    `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&fields=code&limit=1`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    return null;
  }

  const communes = (await response.json()) as Array<{ code?: string }>;
  return communes[0]?.code ?? null;
}

async function resolveCommuneCode(
  lat: number,
  lon: number,
  geocodeCache: GeocodeCache,
): Promise<string | null> {
  const key = `${lat.toFixed(4)}:${lon.toFixed(4)}`;
  if (key in geocodeCache) {
    return geocodeCache[key];
  }

  const inseeCode = await reverseGeocode(lat, lon);
  geocodeCache[key] = inseeCode;
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  return inseeCode;
}

function findStopsFile(directory: string): string | null {
  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find((name) => name.toLowerCase().endsWith("stops.txt"));

  return match ? resolve(directory, match) : null;
}

async function ingestGtfsFeed(
  url: string,
  accumulators: Map<string, CommuneAccumulator>,
  geocodeCache: GeocodeCache,
): Promise<void> {
  const feedId = createHash("sha1").update(url).digest("hex").slice(0, 12);
  const tempDir = join(TEMP_ROOT, feedId);
  const zipPath = join(tempDir, "feed.zip");

  await downloadFile(url, zipPath);
  extractZip(zipPath, tempDir);

  const stopsPath = findStopsFile(tempDir);
  if (!stopsPath) {
    return;
  }

  const stream = createInterface({
    input: createReadStream(stopsPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let latIndex = -1;
  let lonIndex = -1;

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    const cells = parseCsvLine(line, ",");
    if (latIndex === -1) {
      latIndex = cells.indexOf("stop_lat");
      lonIndex = cells.indexOf("stop_lon");
      continue;
    }

    const lat = Number.parseFloat(cells[latIndex] ?? "");
    const lon = Number.parseFloat(cells[lonIndex] ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }

    const inseeCode = await resolveCommuneCode(lat, lon, geocodeCache);
    if (!inseeCode) {
      continue;
    }

    const locationKey = `${lat.toFixed(4)}:${lon.toFixed(4)}`;
    const entry = accumulators.get(inseeCode) ?? {
      stopLocations: new Set<string>(),
      feedIds: new Set<string>(),
    };
    entry.stopLocations.add(locationKey);
    entry.feedIds.add(feedId);
    accumulators.set(inseeCode, entry);
  }
}

async function main(): Promise<void> {
  console.log("Collecte des flux GTFS français…");
  const urls = await collectGtfsUrls();
  const maxFeeds = Number.parseInt(process.env.GTFS_MAX_FEEDS ?? `${urls.length}`, 10);
  const selectedUrls = urls.slice(0, maxFeeds);
  console.log(`Flux GTFS retenus : ${selectedUrls.length} / ${urls.length}`);

  const geocodeCache = loadGeocodeCache();
  const accumulators = new Map<string, CommuneAccumulator>();

  for (const [index, url] of selectedUrls.entries()) {
    console.log(`\n▶ GTFS ${index + 1}/${selectedUrls.length}`);
    try {
      await ingestGtfsFeed(url, accumulators, geocodeCache);
    } catch (error) {
      console.warn(`Flux ignoré (${url}) :`, error);
    }

    if ((index + 1) % 10 === 0) {
      saveGeocodeCache(geocodeCache);
    }
  }

  saveGeocodeCache(geocodeCache);

  const cache: PublicTransportCommuneCache = {};
  for (const [inseeCode, entry] of accumulators) {
    cache[inseeCode] = {
      year: 2026,
      stopCount: entry.stopLocations.size,
      feedCount: entry.feedIds.size,
    };
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache transport collectif GTFS généré : ${OUTPUT_PATH}`);
  console.log(`   Communes desservies : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion GTFS :", error);
  process.exit(1);
});
