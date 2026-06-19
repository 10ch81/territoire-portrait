import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TerritoryProfile } from "../types";

/**
 * Communes de référence pour les tests d'évaluation métier.
 *
 * Les snapshots JSON sont générés depuis l'enrichissement réel (cache local +
 * `getEnrichedTerritoryByInsee`) :
 *
 * ```bash
 * node --import tsx -e "
 *   import { writeFileSync, mkdirSync } from 'node:fs';
 *   import { getEnrichedTerritoryByInsee } from './lib/enrichment/index.ts';
 *   async function exportFixture(code, filename) {
 *     const t = await getEnrichedTerritoryByInsee(code);
 *     mkdirSync('lib/analysis/fixtures', { recursive: true });
 *     writeFileSync('lib/analysis/fixtures/' + filename, JSON.stringify(t, null, 2));
 *   }
 *   await exportFixture('91477', 'palaiseau-91477.json');
 *   await exportFixture('74056', 'chamonix-74056.json');
 *   await exportFixture('35238', 'rennes-35238.json');
 *   await exportFixture('44109', 'nantes-44109.json');
 *   await exportFixture('49007', 'angers-49007.json');
 *   await exportFixture('31557', 'tournefeuille-31557.json');
 *   await exportFixture('30206', 'poulx-30206.json');
 * "
 * ```
 */
export const PALAISEAU_INSEE = "91477";
export const CHAMONIX_INSEE = "74056";
export const RENNES_INSEE = "35238";
export const NANTES_INSEE = "44109";
export const ANGERS_INSEE = "49007";
export const TOURNEFEUILLE_INSEE = "31557";
export const POULX_INSEE = "30206";

const FIXTURES_DIR = resolve(import.meta.dirname, "fixtures");

function loadFixture(filename: string): TerritoryProfile {
  const raw = readFileSync(resolve(FIXTURES_DIR, filename), "utf-8");
  return JSON.parse(raw) as TerritoryProfile;
}

/** Palaiseau (91477) — grande agglomération, SSMSI partiel, croissance démographique. */
export const palaiseauProfile: TerritoryProfile = loadFixture("palaiseau-91477.json");

/** Chamonix-Mont-Blanc (74056) — commune touristique, dette élevée, faible volume RGE. */
export const chamonixProfile: TerritoryProfile = loadFixture("chamonix-74056.json");

/** Rennes (35238) — métropole bretonne, grande centralité équipée et employeuse. */
export const rennesProfile: TerritoryProfile = loadFixture("rennes-35238.json");

/** Nantes (44109) — métropole ligérienne, golden commune analyse + analyze:sample. */
export const nantesProfile: TerritoryProfile = loadFixture("nantes-44109.json");

/** Angers (49007) — préfecture du Maine-et-Loire, grande centralité urbaine. */
export const angersProfile: TerritoryProfile = loadFixture("angers-49007.json");

/** Tournefeuille (31557) — commune dynamique de la couronne toulousaine, centralité EPCI. */
export const tournefeuilleProfile: TerritoryProfile = loadFixture("tournefeuille-31557.json");

/** Poulx (30206) — petite commune périurbaine du Gard, croissance et centralité locale. */
export const poulxProfile: TerritoryProfile = loadFixture("poulx-30206.json");
