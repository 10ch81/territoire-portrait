import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCompareHighlights } from "./highlights";
import { COMPARE_INDICATORS } from "./indicators";
import type { CompareCell } from "./types";

describe("buildCompareHighlights", () => {
  it("produit un point saillant densité quand les communes divergent", () => {
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
    });

    assert.ok(
      highlights.some(
        (item) => item.indicatorId === "density" && /se distingue/i.test(item.sentence),
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
    });

    assert.ok(!highlights.some((item) => item.indicatorId === "schools_open"));
  });
});
