import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  computeDebtPaybackYearsFromSnapshot,
  computeDebtServiceToRevenuePercentFromSnapshot,
} from "./public-accounts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const scanRoots = ["lib", "components", "app", "scripts"];
const allowedSources = new Set(["lib/enrichment/public-accounts.ts"]);

function walkSourceFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      files.push(...walkSourceFiles(absolutePath));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe("resolvePublicAccountsAmountEur — garde d'usage", () => {
  it("n'est référencé que dans public-accounts.ts (hors tests)", () => {
    const violations: string[] = [];

    for (const root of scanRoots) {
      const absoluteRoot = join(repoRoot, root);
      for (const file of walkSourceFiles(absoluteRoot)) {
        const relativePath = relative(repoRoot, file).replace(/\\/g, "/");
        if (allowedSources.has(relativePath)) {
          continue;
        }

        if (readFileSync(file, "utf8").includes("resolvePublicAccountsAmountEur")) {
          violations.push(relativePath);
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `resolvePublicAccountsAmountEur ne doit pas être utilisé hors tests : ${violations.join(", ")}`,
    );
  });
});

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
