import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompareUrl,
  MAX_COMPARE_COMMUNES,
  parseCompareCodesParam,
} from "./parse-codes";

describe("parseCompareCodesParam", () => {
  it("parse des codes séparés par virgule", () => {
    assert.deepEqual(parseCompareCodesParam("35238,44109,49007"), [
      "35238",
      "44109",
      "49007",
    ]);
  });

  it("déduplique et limite à 5 communes", () => {
    assert.equal(
      parseCompareCodesParam("35238,35238,44109,49007,69123,75056,13055").length,
      MAX_COMPARE_COMMUNES,
    );
  });

  it("ignore les codes invalides", () => {
    assert.deepEqual(parseCompareCodesParam("35238,abc,44109"), [
      "35238",
      "44109",
    ]);
  });
});

describe("buildCompareUrl", () => {
  it("construit une URL de comparaison", () => {
    assert.equal(buildCompareUrl(["35238", "44109"]), "/compare?codes=35238,44109");
  });
});
