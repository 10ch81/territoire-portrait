import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFinalTerritorialAnalysis } from "../evaluation-helpers";
import { bousseLikeProfile } from "../contextual-reference-profiles";
import {
  chamonixProfile,
  palaiseauProfile,
  rennesProfile,
} from "../reference-communes";
import {
  expectAtLeastOneProfileSpecificFact,
  expectNoGenericRiskOpportunityIfNotSalient,
  expectNoInventoryOnlyStrengths,
  expectOpportunitiesLinkStrengthAndWatchPoint,
  expectSummaryMentionsTerritorySignature,
  runEditorialEval,
} from "./editorialEvals";

describe("editorialEvals — profils de référence", () => {
  const profiles = [
    { label: "Rennes", profile: rennesProfile, expected: "largeUrbanCenter" as const },
    { label: "Palaiseau", profile: palaiseauProfile, expected: "growthEpciCentrality" as const },
    { label: "Chamonix", profile: chamonixProfile, expected: "mountainTourismCenter" as const },
    { label: "Bousse", profile: bousseLikeProfile, expected: "smallPeriurbanGrowth" as const },
  ];

  for (const { label, profile, expected } of profiles) {
    it(`${label} — éval éditoriale`, () => {
      const { analysis, editorialProfileId } = buildFinalTerritorialAnalysis(profile);
      assert.ok(analysis.editorial);
      assert.equal(editorialProfileId, expected);
      assert.equal(analysis.editorial!.profileId, expected);

      const result = runEditorialEval(
        profile.name,
        profile.inseeCode,
        analysis,
        editorialProfileId,
      );
      assert.equal(result.violations.length, 0, result.violations.join("; "));
      assert.equal(expectNoInventoryOnlyStrengths(analysis.editorial!).length, 0);
      assert.equal(
        expectSummaryMentionsTerritorySignature(analysis.editorial!).length,
        0,
      );
      assert.equal(expectOpportunitiesLinkStrengthAndWatchPoint(analysis).length, 0);
      assert.equal(expectNoGenericRiskOpportunityIfNotSalient(analysis).length, 0);
      assert.equal(expectAtLeastOneProfileSpecificFact(analysis).length, 0);
    });
  }
});
