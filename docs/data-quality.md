# Boucle de qualité des données

Document de référence pour la validation automatique des jeux de données affichés par l'application.

**Statut** : implémenté (P0–P4). Voir phases ci-dessous.

## Objectif

Détecter et corriger automatiquement les erreurs de données (parsers, jointures, unités, cache obsolète) en confrontant ce que l'app affiche à des **sources officielles** reproductibles — sans scraping web générique.

Exemple de référence : commune de **Rennes (35238)** croisée avec API Géo, Melodi INSEE, SIRENE, etc.

## Principes

1. **Liste blanche** — seules les sources documentées dans `lib/sources.ts` servent de référence.
2. **Ne jamais inventer** — en cas d'écart non résolu, alerter ; ne pas « choisir » une valeur au hasard.
3. **Correction auto limitée** — re-ingestion cache et commit CI ; fix code via PR (humain ou agent Cursor).
4. **Pas de scraping web** — pas de Wikipedia, sites municipaux ou articles ; APIs et fichiers officiels uniquement.

## Combinaison des couches

Les options se **empilent** dans un seul pipeline, pas en silos parallèles :

| Ordre | Couche | Rôle |
| ----- | ------ | ---- |
| 1 | **Cohérence interne** (option 2) | Filet bas — calculs, unités, bornes, indicateurs dérivés |
| 2 | **Golden communes + APIs live** (option 1) | Vérité externe — profil enrichi vs fetch direct des APIs |
| 3 | **Classification des écarts** (option 3) | Réduit faux positifs — millésime vs bug parser |
| 4 | **Pipeline CI** (option 6) | Ingest → validate → verify → actions |
| 5 | **Agent Cursor** (option 4) | Investigation + PR uniquement sur échecs de code |

```text
npm run ingest:all
  ↓
npm run validate:internal       # cohérence interne (cache + formules)
  ↓
npm run verify:reference        # golden communes vs APIs live
  ↓
classification des écarts
  ↓
┌────────────────────────────────────────────────────────────┐
│ CACHE_STALE      → re-ingest + commit cache (auto)         │
│ SOURCE_UPDATED   → ingest OK → commit cache (auto)         │
│ MILLESIME_DIFF   → warning (pas d'échec CI)                │
│ DEFINITION_DIFF  → warning documenté                         │
│ PARSER_BUG       → échec CI → issue / PR agent             │
│ JOIN_KEY_ERROR   → échec CI → PR agent                       │
└────────────────────────────────────────────────────────────┘
```

## Golden communes

Communes de référence pour les vérifications croisées (couverture géographique et taille) :

| Commune | Code INSEE | Motif |
| ------- | ---------- | ----- |
| Rennes | 35238 | Ville moyenne, exemple principal |
| Nantes | 44109 | Métropole, déjà utilisée dans `analyze:sample` |
| Paris | 75056 | Très grande commune |
| Commune rurale | 01001 | L'Abergement-Clémenciat — petit territoire |

## Règles de cohérence interne (option 2)

Module cible : `lib/quality/rules.ts`

| Règle | Description |
| ----- | ----------- |
| Densité | `densité ≈ population / surface` (tolérance ~1 %) |
| Indicateurs dérivés | Recalcul vs `computeDerivedIndicators` (`lib/enrichment/derived.ts`) |
| Bornes | Taux et pourcentages ∈ [0, 100] ; population > 0 si présente |
| Historiques | `populationHistory` monotone ou cohérent avec dernier point |
| Ratios | Équipements / 1 000 hab., IRVE / 1 000 hab. alignés avec sources brutes |

Exécution sur **tout le cache** agrégé (`data/cache/*-by-commune.json`) — rapide, sans réseau.

## Vérification référence (option 1)

Module cible : `lib/quality/reference.ts`

Pour chaque golden commune :

1. Charger le profil via `getEnrichedTerritoryByInsee(code)`
2. Refetch live les APIs de référence (API Géo, Recherche Entreprises, etc.)
3. Comparer indicateurs clés

### Seuils

| Niveau | Condition | Action CI |
| ------ | --------- | --------- |
| OK | Écart relatif ≤ 5 % | — |
| Warning | Écart > 5 % et ≤ 50 % | Log + rapport |
| Critique | Écart > 50 % ou facteur ≥ 10× | Échec CI |

## Classification des écarts (option 3)

Module cible : `lib/quality/classify.ts`

| Classe | Exemple | Action |
| ------ | ------- | ------ |
| `MILLESIME_DIFF` | Population 2022 (historique) vs 2024 (API Géo) | Warning |
| `DEFINITION_DIFF` | Population municipale vs RP | Warning documenté |
| `PARSER_BUG` | Colonne CSV décalée, unité ha/m² | Échec CI |
| `JOIN_KEY_ERROR` | Mauvais filtre code INSEE | Échec CI |
| `CACHE_STALE` | Snapshot plus ancien que seuil configuré | Re-ingest auto |
| `SOURCE_UPDATED` | INSEE a publié un nouveau millésime | Ingest + commit si verify OK |

## Millésimes sources — modèle en deux temps

Le cache mensuel (`refresh-cache.yml`) **re-télécharge** les millésimes déjà codés dans `lib/sources.ts`. Il ne monte pas automatiquement de version.

| Phase | Commande / CI | Rôle |
| ----- | ------------- | ---- |
| **1 — Découverte** | `npm run check:source-vintages` · workflow `check-source-vintages.yml` (hebdo) | Sonde les producteurs (INSEE, Melodi, data.gouv) et signale un millésime plus récent que le millésime **supporté** |
| **2 — Adoption** | PR manuelle | Mettre à jour `*_VINTAGE` et URLs dans `lib/sources.ts`, adapter parsers/tests, `npm run ingest:*` + `npm run quality:all` |

Registre : `lib/source-vintages.ts` · helpers : `lib/source-vintage-discovery.ts` · rapport : `data/quality/source-vintage-report.json`.

La CI de découverte **échoue** si une mise à jour est disponible (alerte), sans modifier le cache.

## Pipeline CI (option 6)

Extension de `.github/workflows/refresh-cache.yml` :

1. `npm run ingest:all`
2. `npm run validate:internal` — échec si règles critiques
3. `npm run validate:typology` — golden communes (profils + cache ≥ 30k)
4. `npm run verify:reference` — échec si écart classé `PARSER_BUG` ou `JOIN_KEY_ERROR`
5. Commit `data/cache/*.json` **seulement** si ingest et vérifications OK (ou écarts warning uniquement)
6. Artefact ou commit de `data/quality/latest.json` (rapport JSON)

**Manuel** : GitHub → Actions → *Refresh data cache* → *Run workflow*

## Agent Cursor (option 4)

Automation planifiée (ex. hebdomadaire) ou sur échec CI :

1. Lire `data/quality/latest.json`
2. Si `PARSER_BUG` ou `JOIN_KEY_ERROR` → inspecter `scripts/ingest-*.ts` et `lib/enrichment/`
3. Proposer une PR avec fix + test sur Rennes (35238)
4. Merge humain obligatoire

L'agent **ne corrige pas** les écarts `MILLESIME_DIFF` ou `DEFINITION_DIFF` — il documente.

## Structure de code cible

```text
lib/quality/
  rules.ts              # règles pures (option 2)
  classify.ts           # typage des écarts (option 3)
  compare.ts            # seuils et écarts numériques
  reference.ts          # fetch live + comparaison (option 1)
  golden-communes.ts    # liste INSEE de référence
  staleness.ts          # détection cache obsolète (P4)
  report.ts             # rapport JSON et échec CI

scripts/
  validate-internal.ts
  verify-reference.ts
  quality-all.ts

data/quality/
  latest.json           # rapport CI (artefact ou versionné)
```

## Commandes

```bash
npm run validate:internal   # cohérence interne du cache
npm run verify:reference    # golden communes vs APIs live
npm run quality:all         # validate + verify (sans ingest)
npm run quality:sample        # validate + verify sur Rennes (35238)
```

## Phases d'implémentation

| Phase | Contenu | Statut |
| ----- | ------- | ------ |
| **P0** | `lib/quality/rules.ts` + `scripts/validate-internal.ts` | ✅ |
| **P1** | `scripts/verify-reference.ts` + `reference.ts` | ✅ |
| **P2** | Extension workflow CI + `data/quality/latest.json` | ✅ |
| **P3** | Automation Cursor sur échecs CI | ✅ (voir `docs/automation-data-quality.md`) |
| **P4** | Multi-source + classification + `staleness.ts` | ✅ |

## Indicateurs prioritaires pour verify

| Thème | Champ app | Référence live |
| ----- | --------- | -------------- |
| Démographie | `population`, `densityPerKm2` | API Géo |
| Historique | `populationHistory` | Melodi populations historiques |
| Économie | `enterprises.total` | API Recherche Entreprises |
| Équipements | `equipments.totalEquipments` | Cache BPE (re-lecture fichier) |
| Immobilier | `property.pricePerM2` | Cache DVF (re-lecture fichier) |
| Mobilité | `mobility.chargingPoints` | Cache IRVE |

Étendre la liste lors de l'ajout de nouvelles sources dans `lib/sources.ts`.

## Références

- [docs/mcp-datagouv.md](./mcp-datagouv.md) — exploration de nouvelles sources
- [lib/sources.ts](../lib/sources.ts) — métadonnées et liste blanche
- [lib/enrichment/derived.ts](../lib/enrichment/derived.ts) — indicateurs dérivés à recroiser
- [docs/automation-data-quality.md](./automation-data-quality.md) — automation Cursor (P3)
- [AGENTS.md](../AGENTS.md) — workflow agent
