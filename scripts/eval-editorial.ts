import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildFinalTerritorialAnalysis } from "../lib/analysis/evaluation-helpers";
import { bousseLikeProfile } from "../lib/analysis/contextual-reference-profiles";
import {
  chamonixProfile,
  nantesProfile,
  palaiseauProfile,
  rennesProfile,
} from "../lib/analysis/reference-communes";
import { runEditorialEval } from "../lib/analysis/editorial/editorialEvals";

const profiles = [
  rennesProfile,
  nantesProfile,
  palaiseauProfile,
  chamonixProfile,
  bousseLikeProfile,
];

const results = profiles.map((profile) => {
  const { analysis, editorialProfileId } = buildFinalTerritorialAnalysis(profile);
  return runEditorialEval(profile.name, profile.inseeCode, analysis, editorialProfileId);
});

const report = {
  generatedAt: new Date().toISOString(),
  passed: results.every((result) => result.passed),
  results,
};

const outDir = resolve("data/quality");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "editorial-eval.json"), JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));

if (!report.passed) {
  process.exitCode = 1;
}
