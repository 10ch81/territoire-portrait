import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDepartmentRank,
  formatDepartmentRankLabel,
  normalizeDepartmentRankEntry,
} from "./department-ranks";

describe("computeDepartmentRank", () => {
  it("classe par ordre décroissant", () => {
    const values = new Map([
      ["a", 10],
      ["b", 30],
      ["c", 20],
    ]);
    assert.deepEqual(computeDepartmentRank(values, "b", true), { rank: 1, rankedCount: 3 });
    assert.deepEqual(computeDepartmentRank(values, "c", true), { rank: 2, rankedCount: 3 });
  });

  it("classe par ordre croissant pour le chômage", () => {
    const values = new Map([
      ["a", 12],
      ["b", 4],
      ["c", 8],
    ]);
    assert.deepEqual(computeDepartmentRank(values, "b", false), { rank: 1, rankedCount: 3 });
  });
});

describe("normalizeDepartmentRankEntry", () => {
  it("accepte l'ancien format rank + total", () => {
    assert.deepEqual(normalizeDepartmentRankEntry({ rank: 327, total: 332 }, "35238"), {
      rank: 327,
      rankedCount: 332,
      departmentCode: "35",
      departmentCommuneCount: 332,
    });
  });

  it("retourne null si les champs essentiels manquent", () => {
    assert.equal(normalizeDepartmentRankEntry({ rank: 1 }, "35238"), null);
  });
});

describe("formatDepartmentRankLabel", () => {
  it("précise le département et le périmètre avec donnée", () => {
    assert.equal(
      formatDepartmentRankLabel({
        rank: 3,
        rankedCount: 35,
        departmentCode: "35",
        departmentCommuneCount: 332,
      }),
      "3e / 35 comm. avec donnée · dépt. 35 (332 comm.)",
    );
  });
});
