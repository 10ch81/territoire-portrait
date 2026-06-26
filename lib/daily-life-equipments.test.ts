import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DAILY_LIFE_EQUIPMENT_TYPE_CODES,
  sumDailyLifeEquipments,
} from "./daily-life-equipments";

describe("sumDailyLifeEquipments", () => {
  it("somme uniquement les types du panier OT", () => {
    const byType: Record<string, number> = {
      A101: 2,
      B104: 3,
      D999: 100,
    };

    assert.equal(sumDailyLifeEquipments(byType), 5);
  });

  it("expose 25 types BPE du panier vie courante", () => {
    assert.equal(DAILY_LIFE_EQUIPMENT_TYPE_CODES.length, 25);
  });
});
