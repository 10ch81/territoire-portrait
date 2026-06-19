import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containsOptionalPluralMarker,
  frenchAfterA,
  joinFrenchList,
  joinFrenchPrepositionalList,
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

  it("frenchAfterA — contractions après préposition à", () => {
    assert.equal(frenchAfterA("le chômage des 15-64 ans"), "au chômage des 15-64 ans");
    assert.equal(frenchAfterA("la vacance résidentielle"), "à la vacance résidentielle");
    assert.equal(frenchAfterA("les risques naturels identifiés"), "aux risques naturels identifiés");
    assert.equal(frenchAfterA("l'endettement communal"), "à l'endettement communal");
    assert.equal(
      frenchAfterA("certains indicateurs de sécurité"),
      "à certains indicateurs de sécurité",
    );
    assert.equal(frenchAfterA("une fragilité documentée"), "à une fragilité documentée");
    assert.equal(frenchAfterA("un enjeu local"), "à un enjeu local");
  });

  it("joinFrenchPrepositionalList — coordination prépositionnelle", () => {
    assert.equal(joinFrenchPrepositionalList(["au chômage"]), "au chômage");
    assert.equal(
      joinFrenchPrepositionalList(["au chômage", "à la vacance résidentielle"]),
      "au chômage et à la vacance résidentielle",
    );
    assert.equal(
      joinFrenchPrepositionalList([
        "au chômage",
        "à la vacance résidentielle",
        "aux risques naturels identifiés",
      ]),
      "au chômage, à la vacance résidentielle et aux risques naturels identifiés",
    );
  });
});
