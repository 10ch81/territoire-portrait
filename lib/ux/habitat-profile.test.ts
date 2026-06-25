import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HABITAT_PROFILE_OPTIONS,
  MAX_HABITAT_PRIORITIES,
  parseHabitatProfile,
  prioritiesFromHabitatProfile,
  serializeHabitatProfile,
  validateHabitatPriorities,
} from "./habitat-profile";

describe("habitat-profile", () => {
  it("valide au plus MAX_HABITAT_PRIORITIES priorités reconnues", () => {
    const result = validateHabitatPriorities([
      "familial",
      "logement",
      "mobile",
      "equipee",
      "unknown",
    ]);

    assert.equal(result.length, MAX_HABITAT_PRIORITIES);
    assert.deepEqual(result, ["familial", "logement", "mobile"]);
  });

  it("retombe sur toutes les priorités si aucune sélection valide", () => {
    const all = prioritiesFromHabitatProfile({ priorityIds: [] });
    assert.ok(all.length >= 7);
  });

  it("sérialise et parse le profil habitat", () => {
    const raw = serializeHabitatProfile({ priorityIds: ["familial", "dense"] });
    const parsed = parseHabitatProfile(raw);
    assert.deepEqual(parsed, { priorityIds: ["familial", "dense"] });
  });

  it("expose une option par profil thématique", () => {
    assert.equal(HABITAT_PROFILE_OPTIONS.length, 7);
    assert.ok(HABITAT_PROFILE_OPTIONS.every((option) => option.hint.length > 0));
  });
});
