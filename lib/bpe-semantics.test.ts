import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeBpeBreakdown,
  buildDomainCounts,
  buildQualitativeBpeSummary,
  sumRecordValues,
  sumTransportTypeCounts,
} from "./bpe-semantics";
import { loadEquipmentSnapshot } from "./enrichment/equipments";

describe("bpe-semantics", () => {
  it("détecte que la somme des domaines ne recompose pas le total", () => {
    const entry = {
      year: 2024,
      total: 950,
      byDomain: { B: 65, A: 172, E: 3 },
      byType: { B313: 5, A301: 49, E101: 2, E108: 1 },
    };
    const byDomain = buildDomainCounts(entry.byDomain, {
      B: "Commerces",
      A: "Services pour les particuliers",
      E: "Transports et déplacements",
    });
    const semantics = analyzeBpeBreakdown(entry, byDomain);

    assert.equal(sumRecordValues(entry.byDomain), 240);
    assert.equal(sumRecordValues(entry.byType), 57);
    assert.equal(semantics.domainMetric, "type-count");
    assert.equal(semantics.domainSumReconcilesWithTotal, false);
    assert.equal(semantics.typeSumReconcilesWithTotal, false);
  });

  it("produit un résumé qualitatif sans chiffres par domaine", () => {
    const summary = buildQualitativeBpeSummary(85, [
      { code: "A", label: "Services pour les particuliers", count: 9 },
      { code: "B", label: "Commerces", count: 3 },
      { code: "E", label: "Transports et déplacements", count: 1 },
    ]);

    assert.match(summary, /85 équipements recensés/i);
    assert.match(summary, /diversité de/i);
    assert.equal(summary.includes("(3)"), false);
  });

  it("calcule les occurrences transport à partir des types E", () => {
    const total = sumTransportTypeCounts({
      E101: 2,
      E108: 1,
      B313: 5,
    });

    assert.equal(total, 3);
  });

  it("expose des libellés cohérents dans le loader équipements", () => {
    const snapshot = loadEquipmentSnapshot("01001");

    assert.equal(snapshot.available, true);
    assert.equal(snapshot.domainCountsAreTypeCounts, true);
    assert.match(snapshot.domainBreakdownLabel, /types d'équipements par domaine/i);
    assert.match(snapshot.topTypesLabel, /liste partielle/i);
    assert.ok(snapshot.qualitativeSummary.length > 0);
    assert.equal(snapshot.transport.totalEquipments, snapshot.transport.byType.reduce(
      (acc, type) => acc + type.count,
      0,
    ));
  });
});
