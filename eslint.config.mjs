import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const resolvePublicAccountsImportRestriction = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "@/lib/enrichment/public-accounts",
          importNames: ["resolvePublicAccountsAmountEur"],
          message:
            "Ne pas reconstruire des montants OFGL pour des ratios : utiliser computeDebtPaybackYearsFromSnapshot ou computeDebtServiceToRevenuePercentFromSnapshot. Réservé aux tests unitaires.",
        },
      ],
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx", "lib/enrichment/public-accounts.ts"],
    rules: resolvePublicAccountsImportRestriction,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
