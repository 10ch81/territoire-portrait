# Portrait IA de territoire

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
  types.ts                      # Types TypeScript
components/                       # UI (SearchForm, TerritoryCard, …)
scripts/                          # Ingestion future + analyze-sample
data/cache/                       # Cache local (.gitkeep)
docs/mcp-datagouv.md              # Guide MCP data.gouv.fr
```

## Sources de données (MVP)

| Source        | Usage                                      |
| ------------- | ------------------------------------------ |
| API Géo       | Communes, population, coordonnées, découpage |

Les sources data.gouv.fr plus riches (INSEE, SIRENE, équipements) seront intégrées via **MCP** (exploration) puis **scripts d'ingestion**.

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
