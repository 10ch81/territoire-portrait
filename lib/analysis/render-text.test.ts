import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containsOptionalPluralMarker,
  joinFrenchList,
  renderCountedLabel,
  resolveOptionalPluralMarkers,
  stripFloresPerCapitaRatio,
} from "./render-text";

describe("render-text", () => {
  it("pluralise structure(s) et recensée(s)", () => {
    assert.equal(
      resolveOptionalPluralMarkers("2 structure(s) France Services recensée(s) sur la commune."),
      "2 structures France Services recensée(s) sur la commune.",
    );
  });

  it("renderCountedLabel accorde singulier et pluriel", () => {
    assert.equal(renderCountedLabel(1, "structure France Services recensée", "structures France Services recensées"), "1 structure France Services recensée");
    assert.equal(renderCountedLabel(2, "structure France Services recensée", "structures France Services recensées"), "2 structures France Services recensées");
  });

  it("retire un ratio FLORES non encadré", () => {
    assert.equal(
      stripFloresPerCapitaRatio(
        "2 988 postes salariés et 329 établissements recensés en 2024, soit environ 50 postes pour 100 habitants (FLORES).",
      ),
      "2 988 postes salariés et 329 établissements recensés en 2024.",
    );
  });

  it("détecte les marqueurs (s)", () => {
    assert.equal(containsOptionalPluralMarker("2 structure(s)"), true);
    assert.equal(containsOptionalPluralMarker("2 structures France Services"), false);
  });

  it("joinFrenchList — coordination française", () => {
    assert.equal(joinFrenchList(["la vacance résidentielle"]), "la vacance résidentielle");
    assert.equal(
      joinFrenchList(["la vacance résidentielle", "le chômage des 15-64 ans"]),
      "la vacance résidentielle et le chômage des 15-64 ans",
    );
    assert.equal(joinFrenchList(["a", "b", "c"]), "a, b et c");
  });
});
