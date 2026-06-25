import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPanelProfile } from "@/lib/analysis/fixtures";
import { buildCommunePortrait } from "@/lib/compare/single-portrait";
import { buildCommuneJsonLd } from "./jsonld-commune";

describe("buildCommuneJsonLd", () => {
  it("produit un document JSON-LD avec observations traçables", () => {
    const territory = createPanelProfile("urbanDense");
    const portrait = buildCommunePortrait(territory);
    const doc = buildCommuneJsonLd({
      territory,
      portrait,
      baseUrl: "https://example.test",
    });

    assert.equal(doc["@type"], "AdministrativeArea");
    assert.equal(doc.identifier, territory.inseeCode);
    assert.ok(doc.observation.length > 0);
    assert.ok(doc.isBasedOn.length > 0);
    assert.ok(
      doc.observation.every(
        (item) => typeof item.propertyID === "string" && item["@type"] === "PropertyValue",
      ),
    );
  });

  it("exclut les indicateurs sensibles par défaut", () => {
    const territory = createPanelProfile("urbanDense");
    const portrait = buildCommunePortrait(territory);
    const doc = buildCommuneJsonLd({
      territory,
      portrait,
      baseUrl: "https://example.test",
    });

    assert.ok(!doc.observation.some((item) => item.propertyID === "rsa_share"));
  });
});
