import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  checkSourceVintages,
  formatSourceVintageReport,
} from "../lib/source-vintages";

const REPORT_PATH = resolve(process.cwd(), "data/quality/source-vintage-report.json");

async function main(): Promise<void> {
  console.log("Phase 1 — découverte des millésimes sources…\n");

  const report = await checkSourceVintages();
  mkdirSync(resolve(process.cwd(), "data/quality"), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

  console.log(formatSourceVintageReport(report));
  console.log(`\nRapport JSON : ${REPORT_PATH}`);

  if (report.summary.updateAvailable > 0) {
    console.error(
      `\n${report.summary.updateAvailable} source(s) avec millésime plus récent détecté — adoption manuelle requise (phase 2).`,
    );
    process.exit(1);
  }

  if (report.summary.discoveryFailed > 0) {
    console.warn(
      `\n${report.summary.discoveryFailed} source(s) n'ont pas pu être vérifiées (réseau ou page producteur).`,
    );
  }
}

main().catch((error: unknown) => {
  console.error("Erreur check-source-vintages :", error);
  process.exit(1);
});
