/**
 * Lance toutes les ingestions de données publiques vers data/cache/
 */

import { spawnSync } from "node:child_process";

const steps = [
  { name: "BPE (équipements INSEE)", script: "scripts/ingest-bpe.ts" },
];

for (const step of steps) {
  console.log(`\n▶ ${step.name}`);
  const result = spawnSync("npx", ["tsx", step.script], {
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\n✅ Ingestion terminée.");
