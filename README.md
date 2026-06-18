# Portrait de territoire

MVP Next.js pour générer une **fiche territoriale** d'une commune française à partir de données publiques, enrichie d'une **analyse IA Mistral** côté serveur.

## Fonctionnalités

- Recherche par **nom**, **code postal** ou **code INSEE**
- Fiche avec identité, chiffres clés et sources
- Analyse IA structurée (résumé, points forts, vigilance, opportunités, limites)
- Graceful degradation sans clé Mistral

## Prérequis

- Node.js 20+
- npm
- Clé API Mistral (optionnelle pour l'analyse IA)

## Installation

```bash
git clone <votre-repo>
cd territoire-portrait
npm install
cp .env.example .env.local
```

Renseignez `.env.local` :

```env
MISTRAL_API_KEY=votre_cle
MISTRAL_MODEL=mistral-large-latest
```

## Lancement

```bash
npm run dev       # http://localhost:3000
npm run build     # build production
npm run start     # serveur production
npm run lint      # ESLint
npm run typecheck # TypeScript
```

### Test Mistral en local

```bash
npm run analyze:sample
```

Ce script analyse la commune exemple **Nantes (44109)** sans exposer la clé API.

## Variables d'environnement

| Variable          | Obligatoire | Description                          |
| ----------------- | ----------- | ------------------------------------ |
| `MISTRAL_API_KEY` | Non*        | Clé API Mistral (analyse IA)         |
| `MISTRAL_MODEL`   | Non         | Modèle Mistral (défaut : large)      |

\* Sans clé, l'application fonctionne mais affiche un message clair à la place de l'analyse IA.

## Architecture

```
app/
  page.tsx                      # Accueil + recherche
  commune/[codeInsee]/page.tsx  # Fiche territoire
  api/commune/route.ts          # Résolution commune
  api/analyze/route.ts          # Analyse Mistral (serveur)
lib/
  territory.ts                  # API Géo + normalisation
  mistral.ts                    # Client Mistral
  sources.ts                    # Métadonnées sources
  enrichment/                   # Enrichissement par thème (cache + live)
  quality/                      # Validation qualité (planifié)
  types.ts                      # Types TypeScript
components/                       # UI (SearchForm, TerritoryCard, …)
scripts/                          # Ingestion + validation qualité
data/cache/                       # Snapshots agrégés par commune
data/quality/                     # Rapports CI (latest.json)
docs/mcp-datagouv.md              # Guide MCP data.gouv.fr
docs/data-quality.md              # Boucle qualité des données
```

## Sources de données

| Source | Usage |
| ------ | ----- |
| API Géo | Communes, population, EPCI, coordonnées, comparatif EPCI |
| API Recherche Entreprises | SIRENE — entreprises, ESS, RGE, tranches d'effectif |
| INSEE BPE 2024 (cache) | Équipements par domaine et par type |
| INSEE populations historiques (cache) | Évolution démographique |
| Géorisques (live) | Radon, inondation (AZI), CATNAT |
| RPLS (cache) | Parc de logements sociaux |
| IRVE national (cache) | Bornes de recharge par commune |
| REI (cache) | Taux de fiscalité locale |
| AAV 2020 (cache) | Aire d'attraction des villes |
| DVF (cache) | Prix immobilier au m² |
| RP + FILOSOFI (cache) | Structure par âge, chômage, revenus |

### Ingestion des caches locaux

```bash
npm run ingest:all        # toutes les ingestions
npm run ingest:bpe        # équipements INSEE (~13 Mo)
npm run ingest:population # séries démographiques
npm run ingest:housing    # logements sociaux (RPLS)
npm run ingest:irve       # bornes de recharge (~150 Mo)
npm run ingest:rei        # fiscalité locale (~17 Mo)
npm run ingest:geography  # aires d'attraction 2020
npm run ingest:property   # indicateurs DVF (série 2014-2024)
npm run ingest:social     # structure par âge, chômage, revenus
```

Les caches agrégés sont stockés dans `data/cache/*-by-commune.json` (versionnés pour Vercel, dont `property-by-commune.json` et `social-by-commune.json`).

### Rafraîchissement automatique (CI)

Un workflow GitHub Actions (`.github/workflows/refresh-cache.yml`) relance `npm run ingest:all` **le 1er de chaque mois**, commit les JSON modifiés et déclenche un redéploiement Vercel.

**Évolution planifiée** : après ingest, exécuter `validate:internal` et `verify:reference` avant commit (voir [docs/data-quality.md](./docs/data-quality.md)).

- **Manuel** : GitHub → Actions → *Refresh data cache* → *Run workflow*
- **Maintenance des scripts** : Cursor (exploration MCP, mise à jour des millésimes INSEE)
- **Exécution planifiée** : GitHub Actions (reproductible, logs CI)

### Qualité des données

Boucle automatique en cours de mise en place pour détecter erreurs de parsers, jointures, unités et cache obsolète :

| Couche | Commande (planifiée) | Rôle |
| ------ | -------------------- | ---- |
| Cohérence interne | `npm run validate:internal` | Densité, indicateurs dérivés, bornes |
| Référence live | `npm run verify:reference` | Rennes, Nantes, … vs APIs officielles |
| Pipeline CI | `refresh-cache.yml` | Ingest → quality:all → commit |
| Investigation | automation Cursor | Voir `docs/automation-data-quality.md` |

Pas de scraping web — sources limitées à la liste blanche `lib/sources.ts`.

Guide complet : [docs/data-quality.md](./docs/data-quality.md).

Test rapide (Rennes) : `npm run quality:sample`.

## MCP data.gouv.fr

Le MCP data.gouv.fr sert d'abord à **découvrir et explorer** les jeux de données pertinents dans Cursor, avant de les intégrer au code.

Exemples de requêtes à poser dans Cursor :

- « Trouve les jeux de données data.gouv.fr utiles pour dresser le portrait d'une commune française. »
- « Quels datasets publics permettent d'obtenir population, équipements, entreprises, mobilité et risques pour une commune ? »
- « Trouve des données publiques pertinentes pour analyser la commune de Nantes. »
- « Quels jeux de données sont exploitables automatiquement via CSV, JSON ou API ? »

Voir [docs/mcp-datagouv.md](./docs/mcp-datagouv.md) pour le guide complet.

## Déploiement Vercel

1. Poussez le dépôt sur GitHub.
2. Importez le projet dans [Vercel](https://vercel.com).
3. Ajoutez `MISTRAL_API_KEY` et `MISTRAL_MODEL` dans **Settings → Environment Variables**.
4. Déployez — Next.js est détecté automatiquement.

## Sécurité

- Ne commitez jamais `.env.local`
- Les appels Mistral passent uniquement par le serveur (`lib/mistral.ts`, routes API)
- Les erreurs n'exposent jamais les secrets

## Licence

MIT (à adapter selon vos besoins)
