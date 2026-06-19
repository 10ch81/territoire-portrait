import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveDataLimitSectionLink } from "./data-limit-links";
import { buildDvfContextAlerts, DVF_LOW_MUTATION_THRESHOLD } from "./source-guides";

describe("resolveDataLimitSectionLink", () => {
  it("relie SSMSI à la section Sécurité", () => {
    const link = resolveDataLimitSectionLink(
      "Sécurité (SSMSI) : faits enregistrés par la police/gendarmerie (lieu de commission).",
    );
    assert.deepEqual(link, { sectionId: "securite", sectionLabel: "Sécurité" });
  });

  it("relie DVF à la section Immobilier", () => {
    const link = resolveDataLimitSectionLink(
      "Prix DVF agrégés sur les mutations enregistrées (moyennes communales).",
    );
    assert.deepEqual(link, { sectionId: "immobilier", sectionLabel: "Immobilier" });
  });

  it("retourne null pour une limite sans section associée", () => {
    assert.equal(
      resolveDataLimitSectionLink("Aucune donnée enrichie disponible."),
      null,
    );
  });
});

describe("buildDvfContextAlerts", () => {
  it("alerte lorsque le volume de mutations est faible", () => {
    const alerts = buildDvfContextAlerts(DVF_LOW_MUTATION_THRESHOLD - 1);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /Seulement 9 mutation/);
  });

  it("n'alerte pas au-delà du seuil", () => {
    assert.deepEqual(buildDvfContextAlerts(DVF_LOW_MUTATION_THRESHOLD), []);
  });
});
