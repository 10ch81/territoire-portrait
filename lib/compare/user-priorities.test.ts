import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterHighlightsByPriorities,
  orderCompareBlocksByPriorities,
  parseComparePrioritiesParam,
  serializeComparePrioritiesParam,
  shouldFilterByPriorities,
} from "./user-priorities";
import type { CompareBlock, CompareHighlight } from "./types";

describe("parseComparePrioritiesParam", () => {
  it("ignore les identifiants invalides", () => {
    assert.deepEqual(parseComparePrioritiesParam("familial,invalid,logement"), [
      "familial",
      "logement",
    ]);
  });
});

describe("serializeComparePrioritiesParam", () => {
  it("retourne null si toutes les priorités sont sélectionnées", () => {
    assert.equal(
      serializeComparePrioritiesParam([
        "familial",
        "logement",
        "revenus",
        "equipee",
        "mobile",
        "dynamique",
        "dense",
        "fiscalite",
        "collectivite",
        "implantation",
      ]),
      null,
    );
  });

  it("sérialise une sélection partielle", () => {
    assert.equal(serializeComparePrioritiesParam(["familial", "logement"]), "familial,logement");
  });
});

describe("shouldFilterByPriorities", () => {
  it("ne filtre pas la sélection legacy complète (7 profils)", () => {
    assert.equal(
      shouldFilterByPriorities([
        "familial",
        "logement",
        "revenus",
        "equipee",
        "mobile",
        "dynamique",
        "dense",
      ]),
      false,
    );
  });
});

describe("filterHighlightsByPriorities", () => {
  it("filtre par profil thématique", () => {
    const highlights: CompareHighlight[] = [
      {
        profileId: "familial",
        profileLabel: "Commune familiale",
        indicatorId: "share_under_30",
        sentence: "A",
      },
      {
        profileId: "logement",
        profileLabel: "Accessibilité au logement",
        indicatorId: "price_per_m2",
        sentence: "B",
      },
    ];

    const filtered = filterHighlightsByPriorities(highlights, ["logement"]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.profileId, "logement");
  });
});

describe("orderCompareBlocksByPriorities", () => {
  it("remonte les blocs liés aux priorités", () => {
    const blocks: CompareBlock[] = [
      { id: "identity", label: "Identité", indicatorIds: ["density"] },
      { id: "housing", label: "Logement", indicatorIds: ["price_per_m2"] },
      { id: "population", label: "Population", indicatorIds: ["share_under_30"] },
    ];

    const ordered = orderCompareBlocksByPriorities(blocks, ["familial"]);
    assert.equal(ordered[0]?.id, "population");
  });
});
