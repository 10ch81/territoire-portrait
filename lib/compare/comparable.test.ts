import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POPULATION_TOLERANCE_RATIO } from "./comparable";

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
