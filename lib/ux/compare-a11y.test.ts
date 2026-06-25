import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCompareCellAccessibleName } from "./compare-a11y";

describe("buildCompareCellAccessibleName", () => {
  it("agrège valeur, millésime et rang départemental", () => {
    const label = buildCompareCellAccessibleName({
      communeName: "Rennes",
      indicatorLabel: "Taux de chômage",
      cell: {
        indicatorId: "unemployment_rate",
        communeInsee: "35238",
        displayValue: "14 %",
        numericValue: 14,
        vintage: 2022,
        fragile: false,
        warning: null,
        available: true,
        departmentRankLabel: "327e / 332 comm. avec donnée · dépt. 35 (332 comm.)",
      },
    });

    assert.match(label, /Taux de chômage/);
    assert.match(label, /Rennes/);
    assert.match(label, /14 %/);
    assert.match(label, /327e/);
  });

  it("signale l'absence de donnée", () => {
    const label = buildCompareCellAccessibleName({
      communeName: "Laval",
      indicatorLabel: "Prix moyen au m²",
      cell: undefined,
    });

    assert.equal(label, "Prix moyen au m² — Laval : donnée non disponible");
  });
});
