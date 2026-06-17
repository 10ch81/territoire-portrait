# Portrait IA de territoire — Instructions agent

## Objectif

Construire un système réutilisable pour produire des portraits territoriaux de communes françaises à partir de **données publiques** et d'une **analyse IA prudente** (Mistral).

## Principes

1. **Ne jamais inventer de données** — afficher « Donnée non disponible » si absent.
2. **Sources traçables** — chaque fiche liste les APIs et jeux de données consultés.
3. **Sécurité** — clés API uniquement côté serveur (`process.env`), jamais exposées au client.
4. **Extensibilité** — architecture prête pour ingestion data.gouv.fr via scripts et MCP.

## Structure

| Dossier / fichier        | Rôle                                              |
| ------------------------ | ------------------------------------------------- |
| `app/`                   | Interface Next.js (App Router)                    |
| `lib/territory.ts`       | Résolution commune + normalisation                |
| `lib/mistral.ts`         | Client Mistral centralisé (serveur uniquement)    |
| `lib/sources.ts`         | Métadonnées des sources                           |
| `scripts/`               | Ingestion et outils CLI futurs                    |
| `data/cache/`            | Cache local (non versionné)                       |
| `docs/mcp-datagouv.md`   | Guide MCP data.gouv.fr                            |
| `.cursor/rules/`         | Règles persistantes Cursor                        |

## Workflow de développement

1. Explorer de nouvelles sources via **MCP data.gouv.fr** dans Cursor.
2. Documenter les datasets pertinents dans `docs/mcp-datagouv.md`.
3. Implémenter l'ingestion dans `scripts/` puis brancher `lib/territory.ts`.
4. Enrichir la fiche et le prompt Mistral avec les nouvelles données.
5. Vérifier : `npm run typecheck`, `npm run lint`, `npm run build`.

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
```

## Déploiement

- **GitHub** : dépôt public ou privé, `.env.local` jamais commité.
- **Vercel** : définir `MISTRAL_API_KEY` et `MISTRAL_MODEL` dans les variables d'environnement du projet.

## Prochaines étapes suggérées

- Ingestion CSV/JSON depuis data.gouv.fr (population détaillée, équipements, SIRENE).
- Cache local dans `data/cache/`.
- Automatisation Cursor (ingestion planifiée, génération de rapports batch).
