import assert from "node:assert/strict";
import test from "node:test";
import { createPanelProfile } from "@/lib/analysis/fixtures";
import { buildCommunePortrait } from "@/lib/compare/single-portrait";
import { buildCommuneIndicatorsCsv } from "./csv-export";

test("buildCommuneIndicatorsCsv", () => {
  const territory = createPanelProfile("urbanDense");
  const portrait = buildCommunePortrait(territory);
  const csv = buildCommuneIndicatorsCsv(portrait);

  assert.match(csv, /^id,label,value,/);
  assert.ok(csv.includes("\n"));
  assert.ok(csv.split("\n").length > 1);
});
