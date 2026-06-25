import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMPARE_INDICATORS } from "@/lib/compare/indicators";
import { buildPublicIndicatorCatalog } from "./catalog";

describe("buildPublicIndicatorCatalog", () => {
  it("expose le catalogue comparateur avec traçabilité source", () => {
    const catalog = buildPublicIndicatorCatalog();
    assert.equal(catalog.length, COMPARE_INDICATORS.length);
    assert.ok(catalog.every((entry) => entry.sourceId && entry.sourceName));
    assert.ok(catalog.some((entry) => entry.id === "density"));
  });
});
