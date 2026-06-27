import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCompareHighlights } from "./highlights";
import { COMPARE_INDICATORS } from "./indicators";
import type { CompareCell } from "./types";

describe("buildCompareHighlights", () => {
  it("produit un point saillant densité vs moyenne du groupe (similaires)", () => {
    const columns = [
      { inseeCode: "35238", name: "Rennes" },
      { inseeCode: "01001", name: "L'Abergement-Clémenciat" },
    ];
    const cells: CompareCell[] = [
      {
        indicatorId: "density",
        communeInsee: "35238",
        displayValue: "4 200 hab./km²",
        numericValue: 4200,
        vintage: 2022,
        fragile: false,
        warning: null,
        available: true,
      },
      {
        indicatorId: "density",
        communeInsee: "01001",
        displayValue: "45 hab./km²",
        numericValue: 45,
        vintage: 2022,
        fragile: false,
        warning: null,
        available: true,
      },
    ];

    const highlights = buildCompareHighlights({
      columns,
      cells,
      indicators: COMPARE_INDICATORS,
      benchmark: "similaires",
    });

    assert.ok(
      highlights.some(
        (item) =>
          item.indicatorId === "density" &&
          /vs communes similaires/i.test(item.sentence),
      ),
    );
  });

  it("n'utilise pas schools_open pour le profil familial", () => {
    const columns = [
      { inseeCode: "75056", name: "Paris" },
      { inseeCode: "01001", name: "L'Abergement-Clémenciat" },
    ];
    const cells: CompareCell[] = [
      {
        indicatorId: "schools_open",
        communeInsee: "75056",
        displayValue: "200",
        numericValue: 200,
        vintage: 2024,
        fragile: false,
        warning: null,
        available: true,
      },
      {
        indicatorId: "schools_open",
        communeInsee: "01001",
        displayValue: "2",
        numericValue: 2,
        vintage: 2024,
        fragile: false,
        warning: null,
        available: true,
      },
    ];

    const highlights = buildCompareHighlights({
      columns,
      cells,
      indicators: COMPARE_INDICATORS,
      benchmark: "similaires",
    });

    assert.ok(!highlights.some((item) => item.indicatorId === "schools_open"));
  });

  it("en mode departement, ne retombe pas sur communes similaires", () => {
    const columns = [
      { inseeCode: "35238", name: "Rennes" },
      { inseeCode: "57535", name: "Bousse" },
    ];
    const cells: CompareCell[] = [
      {
        indicatorId: "share_under_30",
        communeInsee: "35238",
        displayValue: "48,3 %",
        numericValue: 48.3,
        vintage: 2022,
        fragile: false,
        warning: null,
        available: true,
      },
      {
        indicatorId: "share_under_30",
        communeInsee: "57535",
        displayValue: "31,3 %",
        numericValue: 31.3,
        vintage: 2022,
        fragile: false,
        warning: null,
        available: true,
      },
      {
        indicatorId: "price_per_m2",
        communeInsee: "35238",
        displayValue: "4 500 €",
        numericValue: 4500,
        vintage: 2024,
        fragile: false,
        warning: null,
        available: true,
      },
      {
        indicatorId: "price_per_m2",
        communeInsee: "57535",
        displayValue: "1 800 €",
        numericValue: 1800,
        vintage: 2024,
        fragile: false,
        warning: null,
        available: true,
      },
    ];

    const highlights = buildCompareHighlights({
      columns,
      cells,
      indicators: COMPARE_INDICATORS,
      benchmark: "departement",
    });

    assert.ok(highlights.every((item) => !/communes similaires/i.test(item.sentence)));
    assert.ok(
      highlights.some((item) => /moyenne départementale/i.test(item.sentence)),
    );
  });
});
