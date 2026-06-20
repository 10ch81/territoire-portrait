import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { buildFinalTerritorialAnalysis } from "./evaluation-helpers";
import { bousseLikeProfile } from "./contextual-reference-profiles";
import {
  chamonixProfile,
  palaiseauProfile,
  rennesProfile,
} from "./reference-communes";
import type { TerritoryProfile } from "../types";

/** Empreinte stable du rendu MVP (summary + listes), hors dataLimits. */
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

/** Golden hashes — régénérer via `npx tsx scripts/gen-mvp-snapshot-hashes.ts` si changement intentionnel. */
const MVP_SNAPSHOT_HASHES: Record<string, string> = {
  palaiseau: "61325ba247e9e5d0",
  chamonix: "7411f09211988e38",
  rennes: "8c02647e3cece5a1",
  bousse: "a9b89a323e594e2d",
};

describe("MVP snapshots — sortie canonique figée", () => {
  const profiles: Array<[string, TerritoryProfile]> = [
    ["palaiseau", palaiseauProfile],
    ["chamonix", chamonixProfile],
    ["rennes", rennesProfile],
    ["bousse", bousseLikeProfile],
  ];

  for (const [name, profile] of profiles) {
    it(`${name} — hash MVP stable`, () => {
      assert.equal(snapshotHash(profile), MVP_SNAPSHOT_HASHES[name]);
    });
  }
});
