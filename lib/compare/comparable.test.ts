import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeComparableSimilarity,
  MAX_COMPARABLE_SUGGESTIONS,
  POPULATION_TOLERANCE_RATIO,
} from "./comparable";
import { MAX_COMPARE_COMMUNES } from "./parse-codes";

describe("MAX_COMPARABLE_SUGGESTIONS", () => {
  it("laisse une place à la commune courante dans le comparateur", () => {
    assert.equal(MAX_COMPARABLE_SUGGESTIONS, MAX_COMPARE_COMMUNES - 1);
  });
});

describe("POPULATION_TOLERANCE_RATIO", () => {
  it("reste à 30 % pour le filtre de similarité", () => {
    assert.equal(POPULATION_TOLERANCE_RATIO, 0.3);
  });

  it("calcule une bande ±30 % cohérente", () => {
    const reference = 10_000;
    const min = reference * (1 - POPULATION_TOLERANCE_RATIO);
    const max = reference * (1 + POPULATION_TOLERANCE_RATIO);
    assert.equal(min, 7000);
    assert.equal(max, 13_000);
    assert.ok(8000 >= min && 8000 <= max);
    assert.ok(15_000 > max);
  });
});

describe("computeComparableSimilarity", () => {
  it("classe une commune très proche en population", () => {
    const result = computeComparableSimilarity(3);
    assert.equal(result.label, "Très proche");
    assert.ok(result.score >= 90);
  });

  it("ne surévalue pas la similarité sans population comparable", () => {
    const result = computeComparableSimilarity(null);
    assert.equal(result.label, "Profil identique · taille non comparée");
    assert.equal(result.score, 50);
  });
});
