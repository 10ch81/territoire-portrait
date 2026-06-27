import assert from "node:assert/strict";
import test from "node:test";
import {
  benchmarkLabel,
  parseBenchmarkParam,
  serializeBenchmarkParam,
} from "./benchmark";

test("parseBenchmarkParam", () => {
  assert.equal(parseBenchmarkParam(undefined), "epci");
  assert.equal(parseBenchmarkParam("departement"), "departement");
  assert.equal(parseBenchmarkParam("invalid"), "epci");
});

test("serializeBenchmarkParam", () => {
  assert.equal(serializeBenchmarkParam("epci"), null);
  assert.equal(serializeBenchmarkParam("similaires"), "similaires");
});

test("benchmarkLabel", () => {
  assert.equal(benchmarkLabel("epci"), "moyenne EPCI");
});
