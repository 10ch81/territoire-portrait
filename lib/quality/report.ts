import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  DiscrepancyClass,
  QualityFinding,
  QualityPhase,
  QualityReport,
  QualitySummary,
} from "./types";

const QUALITY_DIR = resolve(process.cwd(), "data/quality");
const LATEST_PATH = resolve(QUALITY_DIR, "latest.json");

const CI_FAIL_CLASSES: DiscrepancyClass[] = ["PARSER_BUG", "JOIN_KEY_ERROR"];

export function summarizeFindings(findings: QualityFinding[]): QualitySummary {
  let ok = 0;
  let warning = 0;
  let critical = 0;

  for (const finding of findings) {
    if (finding.severity === "ok") {
      ok += 1;
    } else if (finding.severity === "warning") {
      warning += 1;
    } else {
      critical += 1;
    }
  }

  const failed =
    critical > 0 ||
    findings.some(
      (f) => f.class !== undefined && CI_FAIL_CLASSES.includes(f.class),
    );

  return { ok, warning, critical, failed };
}

export function buildReport(
  phase: QualityPhase,
  findings: QualityFinding[],
): QualityReport {
  return {
    generatedAt: new Date().toISOString(),
    phase,
    findings,
    summary: summarizeFindings(findings),
  };
}

export function mergeReports(
  phase: QualityPhase,
  reports: QualityReport[],
): QualityReport {
  const findings = reports.flatMap((report) => report.findings);
  return buildReport(phase, findings);
}

export function writeLatestReport(report: QualityReport): string {
  mkdirSync(QUALITY_DIR, { recursive: true });
  writeFileSync(LATEST_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  return LATEST_PATH;
}

export function readLatestReport(): QualityReport | null {
  if (!existsSync(LATEST_PATH)) {
    return null;
  }

  return JSON.parse(readFileSync(LATEST_PATH, "utf-8")) as QualityReport;
}

export function shouldFailCi(report: QualityReport): boolean {
  return report.summary.failed;
}
