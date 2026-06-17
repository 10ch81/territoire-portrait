# MCP data.gouv.fr dans Portrait IA de territoire

## Rôle du MCP

Le serveur MCP **data.gouv.fr** est un outil d'**exploration agentique** dans Cursor. Il permet de :

- Découvrir des jeux de données publics pertinents pour l'analyse territoriale
- Comparer les formats (API, CSV, JSON, GeoJSON)
- Identifier les métadonnées, fréquences de mise à jour et conditions d'usage
- Préparer l'ingestion automatisée avant d'écrire du code

Dans le MVP, **le code serveur n'appelle pas directement le MCP**. Les données viennent de l'[API Géo](https://geo.api.gouv.fr). Le MCP sert à enrichir le projet progressivement.

## Différence : exploration MCP vs ingestion automatisée

| Aspect            | MCP (Cursor)                         | Ingestion (`scripts/`)                |
| ----------------- | ------------------------------------ | ------------------------------------- |
| Contexte          | Développement, recherche, décision   | Production, pipelines reproductibles  |
| Usage             | Questions en langage naturel         | Scripts TypeScript planifiables       |
| Résultat          | Datasets identifiés, notes, choix    | Fichiers cache, API internes enrichies |
| Reproductibilité  | Manuelle (session agent)             | Automatisable (CI, cron, Vercel cron) |

**Workflow recommandé :**

1. **Explorer** avec MCP → documenter dans ce fichier ou `lib/sources.ts`
2. **Prototyper** un script dans `scripts/ingest-*.ts`
3. **Mettre en cache** dans `data/cache/`
4. **Brancher** `lib/territory.ts` pour exposer les nouvelles données

## Exemples de requêtes MCP à poser dans Cursor

```
Trouve les jeux de données data.gouv.fr utiles pour dresser le portrait d'une commune française.
```

```
Quels datasets publics permettent d'obtenir population, équipements, entreprises, mobilité et risques pour une commune ?
```

```
Trouve des données publiques pertinentes pour analyser la commune de Nantes.
```

```
Quels jeux de données sont exploitables automatiquement via CSV, JSON ou API ?
```

## Datasets à rechercher en priorité

| Thème              | Mots-clés / datasets                          | Intérêt territorial                    |
| ------------------ | --------------------------------------------- | -------------------------------------- |
| Population         | populations légales INSEE                     | Démographie, taille, évolution         |
| Géographie         | API Géo, contours communaux                 | Identité, surface, coordonnées         |
| Économie           | SIRENE, BD Metropole                          | Tissu économique, emploi               |
| Équipements        | Base permanente des équipements (BPE)         | Services publics, commerces            |
| Mobilité           | IRVE, transport en commun                     | Accessibilité, transition              |
| Risques            | GASPAR, PPRI, inondations                     | Vigilance, résilience                  |
| Logement           | DVF, logements sociaux                        | Marché, parc                           |
| Finances locales   | Budget des communes                           | Capacité d'investissement              |

## Scripts placeholders

| Script                         | Statut        | Description                              |
| ------------------------------ | ------------- | ---------------------------------------- |
| `scripts/analyze-sample.ts`    | **Actif**     | Test Mistral sur Nantes (44109)          |
| `scripts/ingest-bpe.ts`        | **Actif**     | Ingestion BPE INSEE → cache communal     |
| `scripts/ingest-all.ts`        | **Actif**     | Lance toutes les ingestions              |
| `scripts/explore-datagouv.ts`  | Placeholder   | Future exploration programmatique        |

## Bonnes pratiques

- Toujours noter l'**URL**, la **licence** et la **date** de consultation d'un dataset
- Préférer les sources avec **API stable** ou **fichiers bulk** téléchargeables
- Ne jamais inventer de chiffres dans l'analyse IA — transmettre uniquement les faits ingérés
- Versionner les scripts d'ingestion, pas le cache (`data/cache/` est ignoré sauf `.gitkeep`)
