/**
 * Lance toutes les ingestions de données publiques vers data/cache/
 */

import { spawnSync } from "node:child_process";

const steps = [
  { name: "BPE (équipements INSEE)", script: "scripts/ingest-bpe.ts" },
  { name: "Population historique (INSEE)", script: "scripts/ingest-population.ts" },
  { name: "Socio-démographie (RP + FILOSOFI)", script: "scripts/ingest-social.ts" },
  { name: "RPLS (logements sociaux)", script: "scripts/ingest-housing.ts" },
  { name: "IRVE (bornes de recharge)", script: "scripts/ingest-irve.ts" },
  { name: "REI (fiscalité locale)", script: "scripts/ingest-rei.ts" },
  { name: "AAV (aires d'attraction)", script: "scripts/ingest-geography.ts" },
  { name: "DVF (prix immobiliers)", script: "scripts/ingest-property.ts" },
  { name: "SSMSI (sécurité / délinquance)", script: "scripts/ingest-security.ts" },
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
