import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldQueryBanAddresses } from "./ban";

describe("shouldQueryBanAddresses", () => {
  it("ignore les codes INSEE seuls", () => {
    assert.equal(shouldQueryBanAddresses("44109"), false);
  });

  it("accepte une adresse textuelle", () => {
    assert.equal(shouldQueryBanAddresses("12 rue de la paix rennes"), true);
  });

  it("refuse les requêtes trop courtes", () => {
    assert.equal(shouldQueryBanAddresses("12"), false);
  });
});
