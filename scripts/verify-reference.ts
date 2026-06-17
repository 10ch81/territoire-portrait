import { buildReport, shouldFailCi, writeLatestReport } from "../lib/quality/report";
import { verifyGoldenCommunes } from "../lib/quality/reference";

function printSummary(report: ReturnType<typeof buildReport>): void {
  const { summary } = report;
  console.log(
    `\nRésumé : ${summary.ok} ok, ${summary.warning} warning(s), ${summary.critical} critique(s)`,
  );

  const issues = report.findings.filter((f) => f.severity !== "ok");
  if (issues.length === 0) {
    console.log("Golden communes alignées avec les références.");
    return;
  }

  console.log("\nÉcarts détectés :");
  for (const finding of issues) {
    console.log(
      `  [${finding.severity}] ${finding.class ?? "-"} — ${finding.inseeCode ?? "?"}: ${finding.message}`,
    );
  }
}

async function main(): Promise<void> {
  console.log("Vérification référence (golden communes vs APIs live)…\n");

  const findings = await verifyGoldenCommunes();
  const report = buildReport("verify-reference", findings);
  const reportPath = writeLatestReport(report);

  printSummary(report);
  console.log(`\nRapport : ${reportPath}`);

  if (shouldFailCi(report)) {
    console.error("\nÉchec : écart critique ou bug parser / jointure.");
    process.exit(1);
  }

  console.log("\nVérification référence OK.");
}

main().catch((error: unknown) => {
  console.error("Erreur verify-reference :", error);
  process.exit(1);
});
