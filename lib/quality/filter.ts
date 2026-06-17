import type { QualityFinding } from "./types";

export function filterFindingsForCommune(
  findings: QualityFinding[],
  inseeCode: string,
): QualityFinding[] {
  return findings.filter(
    (finding) =>
      finding.inseeCode === undefined || finding.inseeCode === inseeCode,
  );
}
