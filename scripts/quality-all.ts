import { buildReport, mergeReports, shouldFailCi, writeLatestReport } from "../lib/quality/report";
import { verifyGoldenCommunes } from "../lib/quality/reference";
import { validateInternalCache } from "../lib/quality/rules";
import { checkCacheStaleness } from "../lib/quality/staleness";
import { validateCacheJoinsWithDuckDb } from "./duckdb/validate-cache-joins";
import { verifyGoldenCachesWithDuckDb } from "./duckdb/verify-golden-caches";
import { withDuckDbSession } from "./duckdb/session";
import { validateTypologySample } from "./validate-typology-sample";

function printSummary(report: ReturnType<typeof buildReport>): void {
  const { summary } = report;
  console.log(
    `\nRésumé global : ${summary.ok} ok, ${summary.warning} warning(s), ${summary.critical} critique(s)`,
  );

  const issues = report.findings.filter((finding) => finding.severity !== "ok");
  if (issues.length === 0) {
    console.log("Qualité des données : aucun problème.");
    return;
  }

  console.log("\nFindings (aperçu) :");
  for (const finding of issues.slice(0, 25)) {
    console.log(
      `  [${finding.severity}] ${finding.class ?? "-"} — ${finding.location}: ${finding.message}`,
    );
  }

  if (issues.length > 25) {
    console.log(`  … et ${issues.length - 25} autre(s).`);
  }
}

async function main(): Promise<void> {
  console.log("Contrôle qualité complet (validate + verify)…\n");

  console.log("▶ validate:internal");
  const duckDbJoinFindings = await withDuckDbSession((connection) =>
    validateCacheJoinsWithDuckDb(connection),
  );
  const internalReport = buildReport("validate-internal", [
    ...validateInternalCache(),
    ...checkCacheStaleness(),
    ...duckDbJoinFindings,
  ]);

  console.log("▶ validate:typology");
  await validateTypologySample();

  console.log("▶ verify:reference");
  const referenceFindings = await verifyGoldenCommunes();
  const offlineGoldenFindings = await withDuckDbSession((connection) =>
    verifyGoldenCachesWithDuckDb(connection),
  );
  const referenceReport = buildReport("verify-reference", [
    ...referenceFindings,
    ...offlineGoldenFindings,
  ]);

  const merged = mergeReports("quality-all", [internalReport, referenceReport]);
  const reportPath = writeLatestReport(merged);

  printSummary(merged);
  console.log(`\nRapport : ${reportPath}`);

  if (shouldFailCi(merged)) {
    console.error("\nÉchec qualité : findings critiques ou bug parser / jointure.");
    process.exit(1);
  }

  console.log("\nContrôle qualité OK.");
}

main().catch((error: unknown) => {
  console.error("Erreur quality:all :", error);
  process.exit(1);
});
