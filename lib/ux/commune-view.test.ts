import assert from "node:assert/strict";
import test from "node:test";
import {
  communeViewLabel,
  parseCommuneViewParam,
  serializeCommuneViewParam,
} from "./commune-view";

test("parseCommuneViewParam — alias rétrocompat", () => {
  assert.equal(parseCommuneViewParam(undefined), "synthese");
  assert.equal(parseCommuneViewParam("particulier"), "synthese");
  assert.equal(parseCommuneViewParam("detail"), "analyse");
  assert.equal(parseCommuneViewParam("analyse"), "analyse");
  assert.equal(parseCommuneViewParam("sources"), "sources");
});

test("serializeCommuneViewParam", () => {
  assert.equal(serializeCommuneViewParam("synthese"), null);
  assert.equal(serializeCommuneViewParam("analyse"), "analyse");
});

test("communeViewLabel", () => {
  assert.equal(communeViewLabel("synthese"), "Synthèse");
  assert.equal(communeViewLabel("sources"), "Sources");
});
