import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPanelProfile } from "@/lib/analysis/fixtures";
import { buildCompareJsonLdFromTerritories } from "./jsonld-compare";

describe("buildCompareJsonLd", () => {
  it("produit un document ItemList avec observations multi-communes", () => {
    const rennes = createPanelProfile("urbanDense");
    const nantes = createPanelProfile("urbanDense");
    nantes.inseeCode = "44109";
    nantes.name = "Nantes";

    const doc = buildCompareJsonLdFromTerritories(
      [rennes, nantes],
      "https://example.test",
      "/compare?codes=35238,44109",
    );

    assert.equal(doc["@type"], "ItemList");
    assert.equal(doc.itemListElement.length, 2);
    assert.ok(doc.comparisonObservation.length > 0);
    assert.ok(
      doc.comparisonObservation.every(
        (item) =>
          item["@type"] === "PropertyValue" &&
          Array.isArray(item.valuesByCommune) &&
          (item.valuesByCommune as unknown[]).length === 2,
      ),
    );
    assert.ok(doc.isBasedOn.length >= 0);
  });

  it("exclut les indicateurs sensibles par défaut", () => {
    const rennes = createPanelProfile("urbanDense");
    const nantes = createPanelProfile("urbanDense");
    nantes.inseeCode = "44109";
    nantes.name = "Nantes";

    const doc = buildCompareJsonLdFromTerritories(
      [rennes, nantes],
      "https://example.test",
      "/compare?codes=35238,44109",
    );

    assert.ok(
      !doc.comparisonObservation.some((item) => item.propertyID === "rsa_share"),
    );
  });

  it("inclut les priorités quand elles filtrent le profil", () => {
    const rennes = createPanelProfile("urbanDense");
    const nantes = createPanelProfile("urbanDense");
    nantes.inseeCode = "44109";
    nantes.name = "Nantes";

    const doc = buildCompareJsonLdFromTerritories(
      [rennes, nantes],
      "https://example.test",
      "/compare?codes=35238,44109&priorites=familial,logement",
      { priorityIds: ["familial", "logement"] },
    );

    assert.deepEqual(doc.priorities, ["familial", "logement"]);
  });
});
