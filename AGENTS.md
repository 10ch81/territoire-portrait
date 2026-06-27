# Portrait de territoire — Instructions agent

## Objectif

Construire un système réutilisable pour produire des portraits territoriaux de communes françaises à partir de **données publiques** et d'une **analyse IA prudente** (Mistral).

## Principes

1. **Ne jamais inventer de données** — afficher « Donnée non disponible » si absent.
2. **Sources traçables** — chaque fiche liste les APIs et jeux de données consultés.
3. **Sécurité** — clés API uniquement côté serveur (`process.env`), jamais exposées au client.
4. **Millésimes récents** — modèle en deux temps : découverte (`npm run check:source-vintages`) puis adoption explicite dans `lib/sources.ts`.
5. **Extensibilité** — architecture prête pour ingestion data.gouv.fr via scripts et MCP.

## Structure

| Dossier / fichier        | Rôle                                              |
| ------------------------ | ------------------------------------------------- |
| `app/`                   | Interface Next.js (App Router)                    |
| `lib/territory.ts`       | Résolution commune + normalisation                |
| `lib/enrichment/`        | SIRENE (API live) + caches thématiques + typologie |
| `lib/typology/`          | Typologie territoriale (`territoryTypology`, profils de comparaison) |
| `lib/mistral.ts`         | Client Mistral centralisé (serveur uniquement)    |
| `lib/sources.ts`         | Métadonnées des sources                           |
| `lib/quality/`           | Règles et vérification qualité données            |
| `scripts/`               | Ingestion, validation et outils CLI               |
| `data/cache/`            | Snapshots agrégés par commune (versionnés pour Vercel) |
| `data/quality/`          | Rapports de validation CI (`latest.json`)         |
| `docs/mcp-datagouv.md`   | Guide MCP, matrice sources, roadmap P1–P3         |
| `docs/data-quality.md`   | Boucle qualité des données                        |
| `.cursor/rules/`         | Règles persistantes Cursor                        |

## Workflow de développement

1. Explorer de nouvelles sources via **MCP data.gouv.fr** dans Cursor.
2. Documenter les datasets pertinents dans `docs/mcp-datagouv.md`.
3. Implémenter l'ingestion dans `scripts/` puis brancher `lib/territory.ts`.
4. Enrichir la fiche et le prompt Mistral avec les nouvelles données.
5. Vérifier : `npm run typecheck`, `npm run lint`, `npm run build`.
6. Qualité données : `npm run validate:internal` et `npm run verify:reference` (voir `docs/data-quality.md`).

## APIs MVP

- **Résolution commune** : [geo.api.gouv.fr](https://geo.api.gouv.fr/decoupage-administratif/communes)
- **Analyse IA** : Mistral (`MISTRAL_API_KEY`, `MISTRAL_MODEL`)

## Commandes

```bash
npm run dev              # serveur de développement
npm run build            # build production
npm run lint             # ESLint
npm run typecheck        # vérification TypeScript
npm run analyze:sample   # test Mistral avec Nantes (44109)
npm run ingest:bpe       # ingestion BPE INSEE → data/cache/
npm run ingest:flores    # emploi salarié A17
npm run ingest:fibre     # couverture fibre ARCEP
npm run ingest:finess    # établissements sanitaires et sociaux
npm run ingest:apl       # APL DREES médecins généralistes
npm run ingest:observatoire-access  # OT accessibilité (santé > 20 min, centralités)
npm run ingest:education # annuaire scolaire (agrégats)
npm run ingest:geography # aires d'attraction 2020
npm run ingest:typology  # densité INSEE, UU, PVD, ACV, FRR, Villages d'avenir
npm run ingest:all       # toutes les ingestions
npm run validate:internal   # cohérence interne cache
npm run validate:typology   # golden communes typologie (cache + profils)
npm run verify:reference    # golden communes vs APIs live
npm run quality:all         # validate + typology + verify
npm run check:source-vintages  # phase 1 — millésimes producteurs vs lib/sources.ts
npm run quality:sample      # validate + verify sur Rennes (35238)
```

## Déploiement

- **GitHub** : dépôt public ou privé, `.env.local` jamais commité.
- **Vercel** : définir `MISTRAL_API_KEY` et `MISTRAL_MODEL` dans les variables d'environnement du projet.

## UX

Feuille de route et statut d'implémentation : **`docs/ux-roadmap.md`**.  
Décision multi-audience (intentions, 3 niveaux fiche, exports) : **`docs/ux-multi-audience.md`**.

Principes : KPI hero → synthèse IA → sections thématiques ; chargement progressif ; sources traçables ; pas d'invention de données ; **lentilles URL** (`vue`, `priorites`, `benchmark`) — pas de score global ni chat IA libre.

## Qualité des données

Boucle automatique documentée dans **`docs/data-quality.md`** :

1. Cohérence interne (calculs, unités, indicateurs dérivés).
2. Golden communes (Rennes 35238, Nantes 44109, …) vs APIs officielles live.
3. Classification des écarts (millésime vs bug parser).
4. Pipeline CI post-ingest (`refresh-cache.yml`).
5. Agent Cursor sur échecs de code (`PARSER_BUG`, `JOIN_KEY_ERROR`) — voir `docs/automation-data-quality.md`.

Pas de scraping web — liste blanche `lib/sources.ts` uniquement.

## Prochaines étapes suggérées

- Ingestion CSV/JSON depuis data.gouv.fr (nouvelles thématiques).
- Configurer l'automation Cursor (`docs/automation-data-quality.md`).
- Comparaison de communes (`/compare`) — phase 2 UX.
