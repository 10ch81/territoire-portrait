import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import type { ReadStream } from "node:fs";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";

export const CACHE_DIR = resolve(process.cwd(), "data/cache");

export function parseCsvLine(line: string, delimiter = ";"): string[] {
  return line.split(delimiter).map((cell) => cell.replace(/^"|"$/g, "").trim());
}

const FRENCH_ACCENTS = /[éèêàâùûôîçÉÊÀÂÙÛÔÎÇ]/;

/** Supprime le BOM UTF-8 éventuel en tête de ligne CSV. */
export function stripCsvBom(line: string): string {
  return line.replace(/^\uFEFF/, "");
}

/**
 * Détecte l'encodage d'un CSV public (UTF-8 ou ISO-8859-1).
 * Les sources récentes data.gouv / INSEE sont en UTF-8 ; les fichiers DGFiP (REI) restent en Latin-1.
 */
export function detectCsvEncoding(filePath: string): BufferEncoding {
  const sample = readFileSync(filePath).subarray(0, 65_536);

  if (sample[0] === 0xef && sample[1] === 0xbb && sample[2] === 0xbf) {
    return "utf-8";
  }

  const utf8 = sample.toString("utf-8");
  if (utf8.includes("\uFFFD")) {
    return "latin1";
  }

  const latin1 = sample.toString("latin1");
  if (FRENCH_ACCENTS.test(latin1) && !FRENCH_ACCENTS.test(utf8)) {
    return "latin1";
  }

  return "utf-8";
}

export function createCsvReadStream(filePath: string): ReadStream {
  return createReadStream(filePath, { encoding: detectCsvEncoding(filePath) });
}

export async function downloadFile(url: string, destination: string): Promise<void> {
  console.log(`Téléchargement : ${url}`);
  const response = await fetch(url);

  if (!response.ok || !response.body) {
    throw new Error(`Téléchargement impossible (statut ${response.status}).`);
  }

  mkdirSync(resolve(destination, ".."), { recursive: true });
  const fileStream = createWriteStream(destination);
  await pipeline(Readable.fromWeb(response.body as never), fileStream);
  console.log(`Fichier enregistré : ${destination}`);
}

function runZipExtraction(zipPath: string, destinationDir: string): void {
  if (platform() === "win32") {
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: "inherit" },
    );

    if (result.status !== 0) {
      throw new Error("Extraction ZIP échouée.");
    }

    return;
  }

  const result = spawnSync("unzip", ["-o", zipPath, "-d", destinationDir], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error("Extraction ZIP échouée (unzip).");
  }
}

export function extractZip(zipPath: string, destinationDir: string): void {
  if (existsSync(destinationDir) && existsSync(resolve(destinationDir, ".extracted"))) {
    return;
  }

  console.log("Extraction de l'archive ZIP…");
  mkdirSync(destinationDir, { recursive: true });
  runZipExtraction(zipPath, destinationDir);
  writeFileSync(resolve(destinationDir, ".extracted"), "ok");
}

export function parseFrenchDecimal(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}
