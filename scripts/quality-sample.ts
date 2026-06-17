import { filterFindingsForCommune } from "../lib/quality/filter";
import { SAMPLE_QUALITY_COMMUNE } from "../lib/quality/golden-communes";
import {
  buildReport,
  mergeReports,
  shouldFailCi,
  writeLatestReport,
} from "../lib/quality/report";
import { verifyReferenceCommune } from "../lib/quality/reference";
import { validateInternalCache } from "../lib/quality/rules";
import { checkCacheStaleness } from "../lib/quality/staleness";

function printSummary(report: ReturnType<typeof buildReport>): void {
  const { summary } = report;
  console.log(
    `\nRésumé (${SAMPLE_QUALITY_COMMUNE.name}) : ${summary.ok} ok, ${summary.warning} warning(s), ${summary.critical} critique(s)`,
  );

  const issues = report.findings.filter((finding) => finding.severity !== "ok");
  if (issues.length === 0) {
    console.log("Aucun problème pour cette commune.");
    return;
  }

  console.log("\nFindings :");
  for (const finding of issues) {
    console.log(
      `  [${finding.severity}] ${finding.class ?? "-"} — ${finding.message}`,
    );
  }
}

async function main(): Promise<void> {
  const { inseeCode, name } = SAMPLE_QUALITY_COMMUNE;

  console.log(
    `Contrôle qualité échantillon — ${name} (${inseeCode})…\n`,
  );

  console.log("▶ validate:internal (filtré sur la commune)");
  const internalFindings = filterFindingsForCommune(
    [...validateInternalCache(), ...checkCacheStaleness()],
    inseeCode,
  );
  const internalReport = buildReport("validate-internal", internalFindings);

  console.log("▶ verify:reference (commune seule)");
  const referenceFindings = await verifyReferenceCommune(inseeCode, name);
  const referenceReport = buildReport("verify-reference", referenceFindings);

  const merged = mergeReports("quality-all", [internalReport, referenceReport]);
  const reportPath = writeLatestReport(merged);

  printSummary(merged);
  console.log(`\nRapport : ${reportPath}`);

  if (shouldFailCi(merged)) {
    console.error("\nÉchec qualité échantillon.");
    process.exit(1);
  }

  console.log("\nContrôle qualité échantillon OK.");
}

main().catch((error: unknown) => {
  console.error("Erreur quality:sample :", error);
  process.exit(1);
});
