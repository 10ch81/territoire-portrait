/**
 * APL DREES — accessibilité potentielle localisée aux soins.
 *
 * Gate MCP (2026-03) : l'export CSV de data.drees.solidarites-sante.gouv.fr est vide
 * (~106 octets, métadonnées seules) ; les ressources data.gouv sont en xlsx/7z sans
 * agrégat communal téléchargeable ≤ 20 Mo.
 *
 * Ce script documente le blocage et se termine sans erreur.
 */

const APL_DATASET_URL =
  "https://www.data.gouv.fr/datasets/laccessibilite-potentielle-localisee-apl/";
const APL_DREES_API =
  "https://data.drees.solidarites-sante.gouv.fr/explore/dataset/530_l-accessibilite-potentielle-localisee-apl/";

console.warn(
  [
    "APL DREES — ingestion non implémentée.",
    "Motif : pas de bulk communal CSV/JSON ≤ 20 Mo (export API DREES vide ; jeux data.gouv en xlsx/7z).",
    `Dataset : ${APL_DATASET_URL}`,
    `Portail DREES : ${APL_DREES_API}`,
    "Voir docs/mcp-datagouv.md pour le statut P2.",
  ].join("\n"),
);

process.exit(0);
