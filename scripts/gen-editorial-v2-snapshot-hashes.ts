import { createHash } from "node:crypto";
import { buildFinalTerritorialAnalysis } from "../lib/analysis/evaluation-helpers";
import { bousseLikeProfile } from "../lib/analysis/contextual-reference-profiles";
import {
  chamonixProfile,
  palaiseauProfile,
  rennesProfile,
} from "../lib/analysis/reference-communes";
import type { TerritoryProfile } from "../lib/types";

function editorialV2SnapshotHash(profile: TerritoryProfile): string {
  const { analysis } = buildFinalTerritorialAnalysis(profile);
  const editorial = analysis.editorial;
  if (!editorial) {
    throw new Error(`editorial absent pour ${profile.name}`);
  }
  const payload = JSON.stringify({
    profileId: editorial.profileId,
    summary: editorial.summary,
    strengths: editorial.strengths,
    opportunities: editorial.opportunities,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

const profiles: Array<[string, TerritoryProfile]> = [
  ["rennes", rennesProfile],
  ["palaiseau", palaiseauProfile],
  ["chamonix", chamonixProfile],
  ["bousse", bousseLikeProfile],
];

for (const [name, profile] of profiles) {
  console.log(name, editorialV2SnapshotHash(profile));
}
