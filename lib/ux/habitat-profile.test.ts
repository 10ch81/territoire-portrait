import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HABITAT_PROFILE_OPTIONS,
  MAX_HABITAT_PRIORITIES,
  normalizeHabitatReferenceCommune,
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
    const all = prioritiesFromHabitatProfile({
      priorityIds: [],
      referenceCommune: null,
    });
    assert.ok(all.length >= 7);
  });

  it("sérialise et parse le profil habitat avec commune de référence", () => {
    const raw = serializeHabitatProfile({
      priorityIds: ["familial", "dense"],
      referenceCommune: { inseeCode: "35238", name: "Rennes" },
    });
    const parsed = parseHabitatProfile(raw);
    assert.deepEqual(parsed, {
      priorityIds: ["familial", "dense"],
      referenceCommune: { inseeCode: "35238", name: "Rennes" },
    });
  });

  it("normalise la commune de référence", () => {
    assert.deepEqual(
      normalizeHabitatReferenceCommune({ inseeCode: "44109", name: "Nantes" }),
      { inseeCode: "44109", name: "Nantes" },
    );
    assert.equal(normalizeHabitatReferenceCommune({ inseeCode: "bad", name: "X" }), null);
  });

  it("expose une option par profil thématique", () => {
    assert.equal(HABITAT_PROFILE_OPTIONS.length, 7);
    assert.ok(HABITAT_PROFILE_OPTIONS.every((option) => option.hint.length > 0));
  });
});
