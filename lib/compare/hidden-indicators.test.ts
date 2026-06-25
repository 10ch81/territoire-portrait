import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterCompareHighlights,
  getHiddenCompareIndicatorIds,
} from "./hidden-indicators";
import type { TerritoryComparisonResult } from "./types";

function minimalComparison(
  cells: TerritoryComparisonResult["cells"],
  highlights: TerritoryComparisonResult["highlights"],
): TerritoryComparisonResult {
  return {
    columns: [{ inseeCode: "35238", name: "Rennes", departmentLabel: null, profileLink: "/commune/35238" }],
    blocks: [],
    cells,
    highlights,
    warnings: [],
  };
}

describe("getHiddenCompareIndicatorIds", () => {
  it("masque les sensibles et les indicateurs fragiles", () => {
    const hidden = getHiddenCompareIndicatorIds(
      minimalComparison(
        [
          {
            indicatorId: "rsa_share",
            communeInsee: "35238",
            displayValue: "5 %",
            numericValue: 5,
            vintage: 2024,
            fragile: true,
            warning: null,
            available: true,
          },
          {
            indicatorId: "price_per_m2",
            communeInsee: "35238",
            displayValue: "3 000 €/m²",
            numericValue: 3000,
            vintage: 2024,
            fragile: true,
            warning: null,
            available: true,
          },
          {
            indicatorId: "population",
            communeInsee: "35238",
            displayValue: "220 000",
            numericValue: 220000,
            vintage: 2024,
            fragile: false,
            warning: null,
            available: true,
          },
        ],
        [],
      ),
      true,
    );

    assert.ok(hidden?.has("rsa_share"));
    assert.ok(hidden?.has("price_per_m2"));
    assert.equal(hidden?.has("population"), false);
  });
});

describe("filterCompareHighlights", () => {
  it("retire les points saillants sur indicateurs masqués", () => {
    const filtered = filterCompareHighlights(
      [
        {
          profileId: "revenus",
          profileLabel: "Revenus",
          indicatorId: "rsa_share",
          sentence: "Exemple RSA",
        },
        {
          profileId: "dense",
          profileLabel: "Démographie",
          indicatorId: "population",
          sentence: "Exemple population",
        },
      ],
      new Set(["rsa_share"]),
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.indicatorId, "population");
  });
});
