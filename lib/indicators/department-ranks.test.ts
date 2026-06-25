import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDepartmentRank,
  formatDepartmentRankLabel,
} from "./department-ranks";

describe("computeDepartmentRank", () => {
  it("classe par ordre décroissant", () => {
    const values = new Map([
      ["a", 10],
      ["b", 30],
      ["c", 20],
    ]);
    assert.deepEqual(computeDepartmentRank(values, "b", true), { rank: 1, total: 3 });
    assert.deepEqual(computeDepartmentRank(values, "c", true), { rank: 2, total: 3 });
  });

  it("classe par ordre croissant pour le chômage", () => {
    const values = new Map([
      ["a", 12],
      ["b", 4],
      ["c", 8],
    ]);
    assert.deepEqual(computeDepartmentRank(values, "b", false), { rank: 1, total: 3 });
  });
});

describe("formatDepartmentRankLabel", () => {
  it("formate le rang départemental", () => {
    assert.equal(formatDepartmentRankLabel({ rank: 3, total: 35 }), "3e / 35 communes (dépt.)");
  });
});
