import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDebtPaybackYearsFromSnapshot,
  computeDebtServiceToRevenuePercentFromSnapshot,
} from "./public-accounts";

describe("computeDebtPaybackYearsFromSnapshot", () => {
  it("privilégie le ratio €/hab. quand les deux agrégats le fournissent", () => {
    const years = computeDebtPaybackYearsFromSnapshot({
      debtOutstandingEur: 999_999,
      debtPerCapitaEur: 200,
      grossSavingsEur: 1,
      grossSavingsPerCapitaEur: 40,
    });

    assert.equal(years, 5);
  });

  it("retombe sur les montants totaux OFGL si seuls ceux-ci existent", () => {
    const years = computeDebtPaybackYearsFromSnapshot({
      debtOutstandingEur: 1_000,
      debtPerCapitaEur: null,
      grossSavingsEur: 200,
      grossSavingsPerCapitaEur: null,
    });

    assert.equal(years, 5);
  });

  it("ne mélange pas montant et €/hab. reconstruit via population", () => {
    const years = computeDebtPaybackYearsFromSnapshot({
      debtOutstandingEur: 1_000,
      debtPerCapitaEur: null,
      grossSavingsEur: null,
      grossSavingsPerCapitaEur: 50,
    });

    assert.equal(years, null);
  });
});

describe("computeDebtServiceToRevenuePercentFromSnapshot", () => {
  it("calcule la part annuité / recettes en €/hab.", () => {
    const percent = computeDebtServiceToRevenuePercentFromSnapshot({
      debtServiceEur: 999,
      debtServicePerCapitaEur: 25,
      operatingRevenueEur: 9_999,
      operatingRevenuePerCapitaEur: 500,
    });

    assert.equal(percent, 5);
  });

  it("refuse un mélange montant / €/hab. sur les deux agrégats", () => {
    const percent = computeDebtServiceToRevenuePercentFromSnapshot({
      debtServiceEur: 100,
      debtServicePerCapitaEur: null,
      operatingRevenueEur: null,
      operatingRevenuePerCapitaEur: 200,
    });

    assert.equal(percent, null);
  });
});
