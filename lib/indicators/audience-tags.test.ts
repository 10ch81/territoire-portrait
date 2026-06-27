import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveIndicatorAudienceTags,
  filterCatalogByAudience,
  parseAudienceParam,
  type IndicatorAudienceTag,
} from "./audience-tags";

test("deriveIndicatorAudienceTags", () => {
  assert.ok(deriveIndicatorAudienceTags(["fiscal"]).includes("collectivity"));
  assert.ok(deriveIndicatorAudienceTags(["family"]).includes("citizen"));
  assert.ok(deriveIndicatorAudienceTags(["family"]).includes("expert"));
});

test("parseAudienceParam et filterCatalogByAudience", () => {
  assert.equal(parseAudienceParam("citizen"), "citizen");
  assert.equal(parseAudienceParam("bad"), null);
  const entries: Array<{ id: string; audienceTags: IndicatorAudienceTag[] }> = [
    { id: "a", audienceTags: ["citizen", "expert"] },
    { id: "b", audienceTags: ["collectivity", "expert"] },
  ];
  assert.equal(filterCatalogByAudience(entries, "citizen").length, 1);
});
