# Automation Cursor — échecs qualité données

Guide pour configurer une **Cursor Automation** qui investigue les échecs du workflow `Refresh data cache` (qualité P3).

## Prérequis

- Dépôt connecté à Cursor Cloud / Automations
- Workflow `.github/workflows/refresh-cache.yml` actif
- Fichiers qualité commités (`lib/quality/`, `scripts/quality-*.ts`)

## Trigger recommandé

| Option | Configuration |
| ------ | ------------- |
| **CI failure** (préféré) | Échec du workflow GitHub `Refresh data cache` sur `master` |
| **Planifié** | Hebdomadaire, après le cron mensuel ingest (ex. 1er du mois 06:00 UTC) |

## Outils à activer

- Accès au dépôt GitHub (clone, branche, PR)
- Terminal ( `npm run quality:all`, `npm run typecheck` )
- Pas de scraping web

## Prompt agent (copier dans l’automation)

```text
Le workflow CI « Refresh data cache » a échoué ou le rapport data/quality/latest.json contient des findings critiques.

1. Lire data/quality/latest.json (ou les logs CI du job « Validate data quality »).
2. Pour chaque finding avec class PARSER_BUG ou JOIN_KEY_ERROR et severity critical :
   - Identifier le script source (scripts/ingest-*.ts ou lib/enrichment/).
   - Reproduire sur Rennes (35238) : npm run verify:reference
3. Proposer un correctif minimal + npm run typecheck && npm run quality:all
4. Ouvrir une PR avec titre « fix(quality): … »

Ne pas corriger les écarts MILLESIME_DIFF ou DEFINITION_DIFF — documenter dans la PR si pertinent.
Ne jamais inventer de données ni modifier les caches sans re-ingest.
```

## Classes d’écarts — action agent

| Classe | Action agent |
| ------ | ------------ |
| `PARSER_BUG` | Investiguer + PR code |
| `JOIN_KEY_ERROR` | Investiguer + PR code |
| `MILLESIME_DIFF` | Documenter seulement |
| `DEFINITION_DIFF` | Documenter seulement |
| `CACHE_STALE` | Suggérer `npm run ingest:all` (CI le fait déjà) |
| `SOURCE_UPDATED` | Vérifier que ingest a tourné |

## Vérification locale avant PR

```bash
npm run quality:all
npm run typecheck
npm run lint
```

## Référence

- [docs/data-quality.md](./data-quality.md) — architecture complète
- [AGENTS.md](../AGENTS.md) — section Qualité des données

## Création dans Cursor

1. Ouvrir **Automations** dans Cursor
2. Nouvelle automation → trigger CI failure sur ce dépôt
3. Coller le prompt ci-dessus
4. Limiter les outils au dépôt (pas MCP data.gouv exploration sauf si nécessaire)
