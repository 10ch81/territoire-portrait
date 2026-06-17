import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";

export const CACHE_DIR = resolve(process.cwd(), "data/cache");

export function parseCsvLine(line: string, delimiter = ";"): string[] {
  return line.split(delimiter).map((cell) => cell.replace(/^"|"$/g, "").trim());
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
