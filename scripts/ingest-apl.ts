import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { read, utils } from "xlsx";
import {
  APL_DENTIST_XLSX_URL,
  APL_GENERAL_PRACTITIONER_XLSX_URL,
  APL_NURSE_XLSX_URL,
  APL_PHYSIOTHERAPIST_XLSX_URL,
  APL_VINTAGE,
  computeDepartmentMedians,
  computeDepartmentMediansFromValues,
  findLatestAplSheetName,
  parseAplEtpRows,
  parseAplGeneralPractitionerRows,
} from "../lib/apl";
import type { AplCommuneCache, AplCommuneCacheEntry, AplEtpValues } from "../lib/types";
import {
  assertDownloadUnderMaxBytes,
  assertFileUnderMaxBytes,
  CACHE_DIR,
  downloadFile,
} from "./ingest-utils";

const OUTPUT_PATH = resolve(CACHE_DIR, "apl-by-commune.json");

const WORKBOOKS = [
  {
    label: "médecins généralistes",
    url: APL_GENERAL_PRACTITIONER_XLSX_URL,
    fileName: "apl-medecins-generalistes.xlsx",
    kind: "general_practitioner" as const,
  },
  {
    label: "infirmières",
    url: APL_NURSE_XLSX_URL,
    fileName: "apl-infirmieres.xlsx",
    kind: "nurse" as const,
  },
  {
    label: "masseurs-kinésithérapeutes",
    url: APL_PHYSIOTHERAPIST_XLSX_URL,
    fileName: "apl-kinesitherapeutes.xlsx",
    kind: "physiotherapist" as const,
  },
  {
    label: "chirurgiens-dentistes",
    url: APL_DENTIST_XLSX_URL,
    fileName: "apl-chirurgiens-dentistes.xlsx",
    kind: "dentist" as const,
  },
];

async function loadWorkbookRows(
  url: string,
  fileName: string,
  label: string,
): Promise<{ year: number; rows: (string | number)[][] }> {
  const filePath = resolve(CACHE_DIR, fileName);

  await assertDownloadUnderMaxBytes(url);
  if (!existsSync(filePath)) {
    console.log(`Téléchargement APL — ${label}…`);
    await downloadFile(url, filePath);
  }
  assertFileUnderMaxBytes(filePath);

  const workbook = read(readFileSync(filePath), { type: "buffer" });
  const sheetName = findLatestAplSheetName(workbook.SheetNames);
  if (!sheetName) {
    throw new Error(`Feuille APL introuvable pour ${label}.`);
  }

  const yearMatch = /^APL (\d{4})$/.exec(sheetName);
  const year = yearMatch ? Number.parseInt(yearMatch[1] ?? "", 10) : APL_VINTAGE;
  const rows = utils.sheet_to_json<(string | number)[]>(workbook.Sheets[sheetName]!, {
    header: 1,
    defval: "",
  });

  return { year, rows };
}

function mergeEtpProfession(
  target: Record<string, AplCommuneCacheEntry>,
  profession: "nurse" | "physiotherapist" | "dentist",
  values: Record<string, AplEtpValues>,
): void {
  for (const [inseeCode, entry] of Object.entries(values)) {
    if (!target[inseeCode]) {
      continue;
    }

    target[inseeCode][profession] = entry;
  }
}

async function main(): Promise<void> {
  console.log("Ingestion APL DREES — soins de ville (4 professions)…");

  const gpWorkbook = WORKBOOKS[0]!;
  const { year: gpYear, rows: gpRows } = await loadWorkbookRows(
    gpWorkbook.url,
    gpWorkbook.fileName,
    gpWorkbook.label,
  );

  const gpPartial = parseAplGeneralPractitionerRows(gpRows, gpYear);
  const communes: Record<string, AplCommuneCacheEntry> = {};

  for (const [inseeCode, partial] of Object.entries(gpPartial)) {
    communes[inseeCode] = {
      generalPractitioner: partial.generalPractitioner,
      nurse: {
        year: gpYear,
        value: 0,
        standardizedPopulation: 0,
        referencePopulation: 0,
      },
      physiotherapist: {
        year: gpYear,
        value: 0,
        standardizedPopulation: 0,
        referencePopulation: 0,
      },
      dentist: {
        year: gpYear,
        value: 0,
        standardizedPopulation: 0,
        referencePopulation: 0,
      },
    };
  }

  const etpValuesByProfession: Record<
    "nurse" | "physiotherapist" | "dentist",
    Record<string, AplEtpValues>
  > = {
    nurse: {},
    physiotherapist: {},
    dentist: {},
  };

  for (const workbook of WORKBOOKS.slice(1) as Array<
    (typeof WORKBOOKS)[number] & { kind: "nurse" | "physiotherapist" | "dentist" }
  >) {
    const { year, rows } = await loadWorkbookRows(
      workbook.url,
      workbook.fileName,
      workbook.label,
    );
    const parsed = parseAplEtpRows(rows, year);
    etpValuesByProfession[workbook.kind] = parsed;
    mergeEtpProfession(communes, workbook.kind, parsed);
    console.log(`   ${workbook.label} : ${Object.keys(parsed).length} communes`);
  }

  const cache: AplCommuneCache = {
    meta: {
      vintage: gpYear,
      ingestedAt: new Date().toISOString(),
    },
    departmentMedians: {
      generalPractitioner: computeDepartmentMedians(gpPartial),
      nurse: computeDepartmentMediansFromValues(
        Object.fromEntries(
          Object.entries(etpValuesByProfession.nurse).map(([code, entry]) => [
            code,
            entry.value,
          ]),
        ),
      ),
      physiotherapist: computeDepartmentMediansFromValues(
        Object.fromEntries(
          Object.entries(etpValuesByProfession.physiotherapist).map(([code, entry]) => [
            code,
            entry.value,
          ]),
        ),
      ),
      dentist: computeDepartmentMediansFromValues(
        Object.fromEntries(
          Object.entries(etpValuesByProfession.dentist).map(([code, entry]) => [
            code,
            entry.value,
          ]),
        ),
      ),
    },
    communes,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache APL généré : ${OUTPUT_PATH}`);
  console.log(`   Millésime MG : ${gpYear}`);
  console.log(`   Communes indexées : ${Object.keys(communes).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion APL :", error);
  process.exit(1);
});
