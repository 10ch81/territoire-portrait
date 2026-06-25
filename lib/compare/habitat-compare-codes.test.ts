import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHabitatCompareCodes,
  hasMinimumHabitatCompareCodes,
} from "./habitat-compare-codes";

describe("buildHabitatCompareCodes", () => {
  it("place la commune de référence en premier et déduplique", () => {
    const codes = buildHabitatCompareCodes("35238", ["44109", "35238", "49007"]);
    assert.deepEqual(codes, ["35238", "44109", "49007"]);
  });

  it("exige au moins deux communes pour comparer", () => {
    assert.equal(hasMinimumHabitatCompareCodes(["35238"]), false);
    assert.equal(hasMinimumHabitatCompareCodes(["35238", "44109"]), true);
  });
});
