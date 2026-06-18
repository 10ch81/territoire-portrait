import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AGE_AGGREGATE_ROUNDING_TOLERANCE,
  computeAgeAggregates,
  isAgeAggregateConsistent,
} from "./age-aggregates";

const SAMPLE_BANDS = [
  { label: "0-14 ans", population: 900, sharePercent: 14.2 },
  { label: "15-29 ans", population: 800, sharePercent: 12.6 },
  { label: "30-44 ans", population: 1_000, sharePercent: 15.7 },
  { label: "45-59 ans", population: 1_100, sharePercent: 17.3 },
  { label: "60-74 ans", population: 1_180, sharePercent: 18.5 },
  { label: "75-89 ans", population: 770, sharePercent: 12.1 },
  { label: "90 ans ou plus", population: 48, sharePercent: 7.5 },
];

describe("computeAgeAggregates", () => {
  it("calcule 60 ans et plus comme somme exacte des tranches disponibles", () => {
    const snapshot = computeAgeAggregates(SAMPLE_BANDS);

    assert.equal(snapshot.reliable, true);
    assert.equal(snapshot.part60_74, 18.5);
    assert.equal(snapshot.part75_89, 12.1);
    assert.equal(snapshot.part90Plus, 7.5);
    assert.equal(snapshot.part60Plus, 38.1);
    assert.equal(isAgeAggregateConsistent(snapshot), true);
  });

  it("part60Plus = part60_74 + part75_89 + part90Plus avec tolérance d'arrondi", () => {
    const snapshot = computeAgeAggregates(SAMPLE_BANDS);

    assert.ok(snapshot.part60Plus !== null);
    assert.ok(snapshot.part60_74 !== null);
    assert.ok(snapshot.part75_89 !== null);
    assert.ok(snapshot.part90Plus !== null);

    const expected =
      Math.round((snapshot.part60_74 + snapshot.part75_89 + snapshot.part90Plus) * 10) / 10;

    assert.ok(
      Math.abs(expected - snapshot.part60Plus) <= AGE_AGGREGATE_ROUNDING_TOLERANCE,
    );
  });

  it("marque l'agrégat non fiable si une tranche 60+ manque", () => {
    const snapshot = computeAgeAggregates([
      { label: "60-74 ans", population: 100, sharePercent: 10 },
      { label: "75-89 ans", population: 50, sharePercent: 5 },
    ]);

    assert.equal(snapshot.reliable, false);
    assert.equal(snapshot.part60Plus, null);
  });
});
