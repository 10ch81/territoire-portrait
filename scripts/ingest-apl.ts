import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { read, utils } from "xlsx";
import {
  APL_GENERAL_PRACTITIONER_XLSX_URL,
  APL_VINTAGE,
  computeDepartmentMedians,
  findLatestAplSheetName,
  parseAplGeneralPractitionerRows,
} from "../lib/apl";
import type { AplCommuneCache } from "../lib/types";
import {
  assertDownloadUnderMaxBytes,
  assertFileUnderMaxBytes,
  CACHE_DIR,
  downloadFile,
} from "./ingest-utils";

const OUTPUT_PATH = resolve(CACHE_DIR, "apl-by-commune.json");
const XLSX_PATH = resolve(CACHE_DIR, "apl-medecins-generalistes.xlsx");

async function loadGeneralPractitionerWorkbook(): Promise<{
  year: number;
  communes: AplCommuneCache["communes"];
}> {
  await assertDownloadUnderMaxBytes(APL_GENERAL_PRACTITIONER_XLSX_URL);

  if (!existsSync(XLSX_PATH)) {
    await downloadFile(APL_GENERAL_PRACTITIONER_XLSX_URL, XLSX_PATH);
  }

  assertFileUnderMaxBytes(XLSX_PATH);

  const workbook = read(readFileSync(XLSX_PATH), { type: "buffer" });

  const sheetName = findLatestAplSheetName(workbook.SheetNames);
  if (!sheetName) {
    throw new Error("Feuille APL introuvable dans le classeur DREES.");
  }

  const yearMatch = /^APL (\d{4})$/.exec(sheetName);
  const year = yearMatch ? Number.parseInt(yearMatch[1] ?? "", 10) : APL_VINTAGE;
  const rows = utils.sheet_to_json<(string | number)[]>(workbook.Sheets[sheetName]!, {
    header: 1,
    defval: "",
  });

  return {
    year,
    communes: parseAplGeneralPractitionerRows(rows, year),
  };
}

async function main(): Promise<void> {
  console.log("Ingestion APL DREES — médecins généralistes…");

  const { year, communes } = await loadGeneralPractitionerWorkbook();
  const departmentMedians = computeDepartmentMedians(communes);

  const cache: AplCommuneCache = {
    meta: {
      vintage: year,
      profession: "general_practitioner",
      ingestedAt: new Date().toISOString(),
    },
    departmentMedians,
    communes,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache APL généré : ${OUTPUT_PATH}`);
  console.log(`   Millésime : ${year}`);
  console.log(`   Communes indexées : ${Object.keys(communes).length}`);
  console.log(`   Départements : ${Object.keys(departmentMedians).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion APL :", error);
  process.exit(1);
});
