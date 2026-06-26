import { buildReport, shouldFailCi, writeLatestReport } from "../lib/quality/report";
import { validateInternalCache } from "../lib/quality/rules";
import { checkCacheStaleness } from "../lib/quality/staleness";
import { validateCacheJoinsWithDuckDb } from "./duckdb/validate-cache-joins";
import { withDuckDbSession } from "./duckdb/session";

function printSummary(report: ReturnType<typeof buildReport>): void {
  const { summary } = report;
  console.log(
    `\nRésumé : ${summary.ok} ok, ${summary.warning} warning(s), ${summary.critical} critique(s)`,
  );

  const issues = report.findings.filter((f) => f.severity !== "ok");
  if (issues.length === 0) {
    console.log("Aucun problème détecté dans les caches.");
    return;
  }

  console.log("\nProblèmes détectés :");
  for (const finding of issues.slice(0, 20)) {
    console.log(
      `  [${finding.severity}] ${finding.ruleId} — ${finding.location}: ${finding.message}`,
    );
  }

  if (issues.length > 20) {
    console.log(`  … et ${issues.length - 20} autre(s) finding(s).`);
  }
}

async function main(): Promise<void> {
  console.log("Validation interne des caches data/cache/…\n");

  const duckDbFindings = await withDuckDbSession((connection) =>
    validateCacheJoinsWithDuckDb(connection),
  );
  const findings = [
    ...validateInternalCache(),
    ...checkCacheStaleness(),
    ...duckDbFindings,
  ];
  const report = buildReport("validate-internal", findings);
  const reportPath = writeLatestReport(report);

  printSummary(report);
  console.log(`\nRapport : ${reportPath}`);

  if (shouldFailCi(report)) {
    console.error("\nÉchec : findings critiques ou bug parser / jointure.");
    process.exit(1);
  }

  console.log("\nValidation interne OK.");
}

main().catch((error: unknown) => {
  console.error("Erreur validate-internal :", error);
  process.exit(1);
});
