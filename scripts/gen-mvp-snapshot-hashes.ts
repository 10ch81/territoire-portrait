import { createHash } from "node:crypto";
import { buildFinalTerritorialAnalysis } from "../lib/analysis/evaluation-helpers";
import {
  chamonixProfile,
  palaiseauProfile,
  rennesProfile,
} from "../lib/analysis/reference-communes";
import { bousseLikeProfile } from "../lib/analysis/contextual-reference-profiles";
import type { TerritoryProfile } from "../lib/types";

function snapshotHash(profile: TerritoryProfile): string {
  const { analysis } = buildFinalTerritorialAnalysis(profile);
  const payload = JSON.stringify({
    summary: analysis.summary,
    strengths: analysis.strengths,
    watchPoints: analysis.watchPoints,
    opportunities: analysis.opportunities,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

const profiles: Array<[string, TerritoryProfile]> = [
  ["palaiseau", palaiseauProfile],
  ["chamonix", chamonixProfile],
  ["rennes", rennesProfile],
  ["bousse", bousseLikeProfile],
];

for (const [name, profile] of profiles) {
  console.log(name, snapshotHash(profile));
}
