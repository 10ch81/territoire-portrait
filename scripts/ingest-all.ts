/**
 * Lance toutes les ingestions de données publiques vers data/cache/
 * Ingestions CSV lourdes (BPE, FLORES, DVF, SSMSI, RP/FILOSOFI) : agrégation DuckDB offline.
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
  { name: "Typologies communales", script: "scripts/ingest-typology.ts" },
  { name: "DVF (prix immobiliers)", script: "scripts/ingest-property.ts" },
  { name: "SSMSI (sécurité / délinquance)", script: "scripts/ingest-security.ts" },
  { name: "Commute (RP domicile-travail)", script: "scripts/ingest-commute.ts" },
  { name: "QPV (politique de la ville)", script: "scripts/ingest-qpv.ts" },
  { name: "SIDE (stocks entreprises INSEE)", script: "scripts/ingest-enterprise-side.ts" },
  { name: "France Services", script: "scripts/ingest-services.ts" },
  { name: "Tourisme (capacités INSEE)", script: "scripts/ingest-tourism.ts" },
  { name: "FLORES (emploi salarié A17)", script: "scripts/ingest-flores.ts" },
  { name: "ARCEP (couverture fibre)", script: "scripts/ingest-fibre.ts" },
  { name: "FINESS (santé & social)", script: "scripts/ingest-finess.ts" },
  { name: "Annuaire Éducation", script: "scripts/ingest-education.ts" },
  { name: "LOVAC (vacance parc privé)", script: "scripts/ingest-lovac.ts" },
  { name: "France Travail (inscrits communaux)", script: "scripts/ingest-france-travail.ts" },
  { name: "IPS DEPP (écoles)", script: "scripts/ingest-ips.ts" },
  { name: "APL DREES (accessibilité soins)", script: "scripts/ingest-apl.ts" },
  { name: "CNAF (indicateurs précarité / RSA)", script: "scripts/ingest-caf.ts" },
  { name: "Observatoire des territoires (accessibilité)", script: "scripts/ingest-observatoire-access.ts" },
  { name: "Rangs départementaux (compare)", script: "scripts/ingest-department-ranks.ts" },
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
