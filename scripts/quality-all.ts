import { buildReport, mergeReports, shouldFailCi, writeLatestReport } from "../lib/quality/report";
import { verifyGoldenCommunes } from "../lib/quality/reference";
import { validateInternalCache } from "../lib/quality/rules";
import { checkCacheStaleness } from "../lib/quality/staleness";

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
  const internalReport = buildReport("validate-internal", [
    ...validateInternalCache(),
    ...checkCacheStaleness(),
  ]);

  console.log("▶ verify:reference");
  const referenceFindings = await verifyGoldenCommunes();
  const referenceReport = buildReport("verify-reference", referenceFindings);

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
