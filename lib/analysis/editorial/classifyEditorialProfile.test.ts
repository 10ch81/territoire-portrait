import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTerritoryContext } from "../context/buildTerritoryContext";
import { bousseLikeProfile } from "../contextual-reference-profiles";
import {
  chamonixProfile,
  palaiseauProfile,
  rennesProfile,
} from "../reference-communes";
import { classifyEditorialProfile } from "./classifyEditorialProfile";

describe("classifyEditorialProfile", () => {
  it("Rennes → largeUrbanCenter", () => {
    const context = buildTerritoryContext(rennesProfile);
    assert.equal(
      classifyEditorialProfile(rennesProfile, context),
      "largeUrbanCenter",
    );
  });

  it("Palaiseau → growthEpciCentrality", () => {
    const context = buildTerritoryContext(palaiseauProfile);
    assert.equal(
      classifyEditorialProfile(palaiseauProfile, context),
      "growthEpciCentrality",
    );
  });

  it("Chamonix → mountainTourismCenter", () => {
    const context = buildTerritoryContext(chamonixProfile);
    assert.equal(
      classifyEditorialProfile(chamonixProfile, context),
      "mountainTourismCenter",
    );
  });

  it("Bousse → smallPeriurbanGrowth", () => {
    const context = buildTerritoryContext(bousseLikeProfile);
    assert.equal(
      classifyEditorialProfile(bousseLikeProfile, context),
      "smallPeriurbanGrowth",
    );
  });
});
