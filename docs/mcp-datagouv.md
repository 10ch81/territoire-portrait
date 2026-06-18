# MCP data.gouv.fr dans Portrait de territoire

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

## Niveaux de fiabilité des sources

Chaque source doit être classée avant ingestion. Cette classification guide l'affichage UX, le prompt Mistral et les garde-fous (`lib/data-limits.ts`).

| Niveau | Sigle | Usage dans le portrait | Exemples |
| ------ | ----- | ---------------------- | -------- |
| **Robuste** | `R` | Diagnostic principal, comparaisons EPCI/département | INSEE RP, BPE, FILOSOFI, AAV, Géorisques (radon/AZI), DVF agrégé officiel |
| **Complémentaire** | `C` | Enrichissement, comptages, contexte | SIRENE (API), ESS/RGE, IRVE, RPLS, REI, Annuaire Éducation, France Services |
| **Sensible** | `S` | Affichage avec méthode explicite et limites renforcées | SSMSI, prix DVF (faible volume de mutations), extrapolations IA |

Règles :

- Ne jamais baser une **conclusion sociale** (ex. « tensions », « dégradation ») sur une seule source `S`.
- Toujours documenter **millésime, périmètre, définition** dans `note` du snapshot et `lib/sources.ts`.
- Préférer les **indicateurs pré-agrégés officiels** (DVF commune, Melodi) aux recalculs artisanaux sur mutations brutes.

---

## Matrice sources × thèmes × statut

Légende statut : **✅** implémenté · **⚠️** partiel · **❌** absent · **📋** prioritaire roadmap

Référence implémentation : `lib/sources.ts`, `lib/enrichment/*`, `scripts/ingest-*.ts`.

### Identité, démographie, emploi

| Source | Thème | Niv. | Statut | Module / script | Notes |
| ------ | ----- | ---- | ------ | --------------- | ----- |
| [API Géo — communes](https://geo.api.gouv.fr) | Identité, population légale, EPCI, surface | R | ✅ | `lib/territory.ts` | Socle de résolution commune |
| [INSEE — Populations historiques](https://api.insee.fr/melodi/file/DS_POPULATIONS_HISTORIQUES/) | Évolution démographique | R | ✅ | `ingest-population.ts` → `population.ts` | Série historique par commune |
| [INSEE — RP 2021 structure par âge](https://www.insee.fr/fr/statistiques/8201904) | Pyramide des âges | R | ✅ | `ingest-social.ts` → `sociodemographics.ts` | Millésime RP 2021 |
| [INSEE — RP 2021 emploi / chômage](https://www.insee.fr/fr/statistiques/8202916) | Chômage 15-64 ans | R | ✅ | `ingest-social.ts` | Taux au recensement, pas au BIT |
| [INSEE — FILOSOFI](https://www.insee.fr/fr/metadonnees/source/operation/s2146/presentation) | Revenu médian disponible | R | ✅ | `ingest-social.ts` | Millésime 2020 (revenus 2019) |
| [INSEE — RP logement 2021](https://www.insee.fr/fr/statistiques/6682710) | Vacance, parc total, statut d'occupation | R | ❌ 📋 P1 | — | Distinct du RPLS (parc social) ; vacance générale absente |
| [INSEE — RP mobilité domicile-travail](https://www.insee.fr/fr/statistiques/6682710) | Modes de transport des actifs | R | ❌ 📋 P1 | — | Complète GTFS (usage vs offre) |
| [INSEE — Dossier / comparateur territoires](https://www.insee.fr/fr/statistiques/2011101) | Référence croisée | R | ⚠️ | — | Pages web de référence ; données couvertes via Melodi/cache, pas de scrape |

### Géographie, centralité, institutions

| Source | Thème | Niv. | Statut | Module / script | Notes |
| ------ | ----- | ---- | ------ | --------------- | ----- |
| [INSEE — AAV 2020](https://www.data.gouv.fr/datasets/zonage-en-aires-dattraction-des-villes-france-entiere-enrichi-zaav-2020/) | Centralité, bassin d'emploi | R | ✅ | `ingest-geography.ts` → `geography.ts` | Rang et population de l'aire |
| [BANATIC](https://www.banatic.interieur.gouv.fr/) | EPCI, syndicats, PNR, rattachements | R | ⚠️ | `territory.ts` (EPCI via API Géo) | Syndicats mixtes et structures hors EPCI non ingérés |
| [SIG Ville](https://sig.ville.gouv.fr/) | QPV, Cœur de ville, politique de la ville | R | ❌ 📋 P1 | — | Fort levier diagnostic territorial |

### Économie et tissu d'activités

| Source | Thème | Niv. | Statut | Module / script | Notes |
| ------ | ----- | ---- | ------ | --------------- | ----- |
| [API Recherche Entreprises / SIRENE](https://recherche-entreprises.api.gouv.fr) | Unités légales, ESS, RGE | C | ⚠️ | `enterprises.ts` (live) | Filtre `etat_administratif=A` ; définitions ≠ INSEE démographie entreprises ; plafond 10 000 |
| [INSEE — démographie d'entreprises](https://www.insee.fr/fr/statistiques/2011101) | ULE / établissements économiquement actifs | R | ❌ 📋 P2 | — | Aligner comptages SIRENE sur définitions INSEE |
| [data.gouv — ESS](https://www.data.gouv.fr/datasets/liste-des-entreprises-de-less) | Économie sociale et solidaire | C | ⚠️ | `enterprises.ts` (filtre API) | Comptage via API, pas fichier bulk |
| [data.gouv — RGE](https://www.data.gouv.fr/datasets/liste-des-entreprises-rge) | Transition écologique locale | C | ⚠️ | `enterprises.ts` (filtre API) | Idem |

### Équipements, services, santé, éducation

| Source | Thème | Niv. | Statut | Module / script | Notes |
| ------ | ----- | ---- | ------ | --------------- | ----- |
| [INSEE — BPE 2024](https://api.insee.fr/melodi/file/DS_BPE/DS_BPE_2024_CSV_FR) | Commerces, santé, écoles, services | R | ✅ | `ingest-bpe.ts` → `equipments.ts` | Dénombrement, pas accessibilité |
| [Annuaire de l'Éducation](https://www.data.gouv.fr/datasets/annuaire-de-leducation) | Établissements scolaires ouverts | C | ❌ 📋 P2 | — | Liste nominative ; BPE domaine C partiellement substitue |
| [France Services](https://www.data.gouv.fr/datasets/liste-des-structures-labellisees-france-services) | Accueil public de proximité | C | ❌ 📋 P2 | — | |
| [DREES — APL santé](https://www.data.gouv.fr/datasets/laccessibilite-potentielle-localisee-apl) | Accessibilité aux soins | C | ❌ 📋 P2 | — | Quantité BPE ≠ accessibilité |
| [CartoSanté / AtlaSanté](https://cartosante.atlasante.fr/) | Offre et accès PS | C | ❌ | — | Portail carto ; pas de bulk simple ; APL prioritaire |

### Mobilité et transition

| Source | Thème | Niv. | Statut | Module / script | Notes |
| ------ | ----- | ---- | ------ | --------------- | ----- |
| [BPE — domaine E (transport)](https://api.insee.fr/melodi/file/DS_BPE/DS_BPE_2024_CSV_FR) | Arrêts, gares recensés | C | ⚠️ | `equipments.ts` (`transport`) | Ne décrit pas l'offre horaire |
| [transport.data.gouv.fr — GTFS liO Occitanie](https://transport.data.gouv.fr/datasets/reseau-lio-occitanie) | Lignes, arrêts, fréquences TC | R | ❌ 📋 P1 | — | Modèle réplicable par région/exploitant |
| [IRVE national](https://www.data.gouv.fr/datasets/base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques/) | Bornes de recharge VE | C | ✅ | `ingest-irve.ts` → `mobility.ts` | |

### Logement et immobilier

| Source | Thème | Niv. | Statut | Module / script | Notes |
| ------ | ----- | ---- | ------ | --------------- | ----- |
| [RPLS](https://www.data.gouv.fr/datasets/repertoire-des-logements-locatifs-des-bailleurs-sociaux-rpls-2021/) | Parc locatif social, vacance RPLS | C | ✅ | `ingest-housing.ts` → `housing.ts` | Vacance **sociale** uniquement |
| [DVF — indicateurs agrégés commune](https://www.data.gouv.fr/datasets/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2024/) | Prix m², volumes mutations | S | ✅ | `ingest-property.ts` → `property.ts` | Méthode producteur ; faible volume = prudence |
| [Cerema — DVF+](https://datafoncier.cerema.fr/donnees/autres-donnees-foncieres/dvfplus-open-data) | Mutations géolocalisées | S | ❌ 📋 P3 | — | Utile si carto ou typologie fine ; agrégé suffit pour MVP |

### Risques, sécurité, finances

| Source | Thème | Niv. | Statut | Module / script | Notes |
| ------ | ----- | ---- | ------ | --------------- | ----- |
| [Géorisques](https://georisques.gouv.fr/) | Radon, AZI, CATNAT | R | ✅ | `risks.ts` (API live) | |
| [PICTO Occitanie — PPRN](https://catalogue.picto-occitanie.fr/) | Zonages réglementaires risques | R | ❌ 📋 P2 | — | Complète Géorisques pour zonage PPR |
| [SSMSI](https://www.data.gouv.fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales) | Délinquance enregistrée | S | ✅ | `ingest-security.ts` → `security.ts` | Diffusion partielle ; pas de ressenti |
| [Interstats](https://www.interieur.gouv.fr/Interstats) | Méthodologie sécurité | — | ⚠️ | — | Référence documentaire pour SSMSI |
| [REI](https://www.data.gouv.fr/datasets/impots-locaux-fichier-de-recensement-des-elements-dimposition-a-la-fiscalite-directe-locale-rei-4/) | Taux fiscalité locale | C | ✅ | `ingest-rei.ts` → `fiscal.ts` | Taux uniquement, pas recettes |
| [OFGL / data.ofgl.fr](https://data.ofgl.fr/) | Budget, dette, gestion publique | C | ❌ 📋 P2 | — | Plus riche que REI pour capacité financière |

### Tourisme, artificialisation, transversal

| Source | Thème | Niv. | Statut | Module / script | Notes |
| ------ | ----- | ---- | ------ | --------------- | ----- |
| [INSEE — capacités touristiques](https://www.insee.fr/fr/statistiques/2021703) | Hébergements touristiques | C | ❌ 📋 P3 | — | |
| [DATAtourisme](https://www.data.gouv.fr/datasets/datatourisme-la-base-nationale-des-donnees-publiques-dinformation-touristique-en-open-data) | Offre touristique | C | ❌ 📋 P3 | — | |
| [Portail artificialisation des sols](https://artificialisation.developpement-durable.gouv.fr/) | Consommation d'espaces, ZAN | C | ❌ 📋 P3 | — | |
| [Observatoire des territoires](https://www.observatoire-des-territoires.gouv.fr/) | Indicateurs transversaux | C | ❌ 📋 P3 | — | Agrégateur ; utile pour comparaisons |

### Synthèse par thème (couverture actuelle)

| Thème | Couverture | Lacune principale |
| ----- | ---------- | ----------------- |
| Démographie | ✅ Forte | RP logement (vacance générale) |
| Emploi / revenus | ✅ Forte | Modes domicile-travail, emploi salarié au lieu de travail |
| Économie | ⚠️ Partielle | Définitions SIRENE vs INSEE |
| Équipements | ✅ Forte | Accessibilité santé (APL), Annuaire Éducation |
| Mobilité | ⚠️ Faible | GTFS / offre TC réelle |
| Logement | ⚠️ Partielle | Confusion possible RPLS vs vacance RP |
| Immobilier | ✅ Correcte | Faibles volumes → prudence |
| Risques | ✅ Correcte | PPRN réglementaire |
| Sécurité | ⚠️ Prudent | Source sensible, petites communes |
| Finances | ⚠️ Partielle | REI sans budgets OFGL |
| Politique ville | ❌ Absente | SIG Ville / QPV |
| Institutions | ⚠️ Partielle | BANATIC syndicats |

---

## Roadmap d'enrichissement (priorisée)

Ordre recommandé pour les prochaines ingestions. Chaque item suit le workflow MCP → script → cache → `lib/enrichment/`.

### P1 — Socle diagnostic défendable

| # | Source | Thème | Effort estimé | Justification |
| - | ------ | ----- | ------------- | ------------- |
| 1 | GTFS (liO + modèle national) | Mobilité | Moyen | Corrige l'angle mort BPE-transport |
| 2 | SIG Ville / QPV | Politique ville | Faible | Indicateur structurant non couvert |
| 3 | RP logement 2021 | Logement | Faible | Vacance générale, parc total (Melodi ou CSV INSEE) |
| 4 | RP mobilité domicile-travail | Mobilité | Faible | Croisement usage / offre TC |

### P2 — Enrichissement et alignement

| # | Source | Thème | Effort estimé | Justification |
| - | ------ | ----- | ------------- | ------------- |
| 5 | INSEE démographie d'entreprises | Économie | Moyen | Recalibrer SIRENE vs définitions officielles |
| 6 | France Services + Annuaire Éducation | Services | Faible | Listes bulk, jointure code INSEE |
| 7 | APL santé (DREES) | Santé | Moyen | Accessibilité vs dénombrement BPE |
| 8 | BANATIC | Institutions | Faible | Syndicats, PNR, complément EPCI |
| 9 | OFGL | Finances | Moyen | Budgets et dette communale |
| 10 | PPRN (catalogues régionaux) | Risques | Élevé | GéoJSON hétérogène par région |

### P3 — Thématiques complémentaires

| # | Source | Thème | Justification |
| - | ------ | ----- | ------------- |
| 11 | DVF+ | Immobilier | Carto / typologie fine si besoin |
| 12 | DATAtourisme + capacités INSEE | Tourisme | Communes touristiques |
| 13 | Artificialisation des sols | Environnement | ZAN, consommation d'espaces |
| 14 | Observatoire des territoires | Transversal | Comparaisons pré-calculées |

### Critères de passage en production

Pour chaque nouvelle source :

1. Entrée dans `lib/sources.ts` avec URL, description, niveau `R`/`C`/`S`.
2. Script `scripts/ingest-*.ts` + entrée dans `ingest-all.ts`.
3. Snapshot typé dans `lib/types.ts` + module `lib/enrichment/`.
4. Règle(s) dans `lib/quality/rules.ts` si agrégats calculés.
5. Golden commune dans `verify:reference` si API live disponible.
6. Section UX + acronyme dans `lib/ux/` si affichage dédié.
7. Mise à jour de cette matrice.

---

## Datasets à rechercher en priorité (MCP)

Requêtes MCP orientées par les lacunes P1 :

| Thème | Mots-clés / datasets | Priorité |
| ----- | -------------------- | -------- |
| Mobilité | GTFS, NeTEx, transport.data.gouv.fr, liO | P1 |
| Politique ville | SIG Ville, QPV, Cœur de ville | P1 |
| Logement | RP logement 2021, vacance, statut occupation | P1 |
| Santé | APL, accessibilité localisée DREES | P2 |
| Finances | OFGL, budgets locaux | P2 |
| Économie | Démographie d'entreprises INSEE, SIRENE filtres | P2 |

## Scripts d'ingestion

| Script                         | Statut        | Description                              |
| ------------------------------ | ------------- | ---------------------------------------- |
| `scripts/ingest-all.ts`        | **Actif**     | Lance toutes les ingestions              |
| `scripts/ingest-bpe.ts`        | **Actif**     | BPE INSEE 2024 → `bpe-by-commune.json`   |
| `scripts/ingest-population.ts` | **Actif**     | Populations historiques INSEE            |
| `scripts/ingest-social.ts`     | **Actif**     | RP 2021 (âge, chômage) + FILOSOFI        |
| `scripts/ingest-housing.ts`    | **Actif**     | RPLS logements sociaux                   |
| `scripts/ingest-irve.ts`       | **Actif**     | Bornes de recharge IRVE                  |
| `scripts/ingest-rei.ts`        | **Actif**     | Taux fiscalité locale (REI)              |
| `scripts/ingest-geography.ts`  | **Actif**     | Aires d'attraction 2020                  |
| `scripts/ingest-property.ts`   | **Actif**     | Indicateurs DVF agrégés (2014-2024)      |
| `scripts/ingest-security.ts`   | **Actif**     | SSMSI délinquance enregistrée            |
| `scripts/validate-internal.ts` | **Actif**   | Cohérence interne du cache communal      |
| `scripts/verify-reference.ts`  | **Actif**   | Golden communes vs APIs live             |
| `scripts/quality-all.ts`       | **Actif**     | validate + verify (pipeline qualité)     |
| `scripts/analyze-sample.ts`    | **Actif**     | Test Mistral sur Nantes (44109)          |
| `scripts/explore-datagouv.ts`  | Placeholder   | Future exploration programmatique        |

## Qualité des données

Voir [docs/data-quality.md](./data-quality.md) pour la boucle complète :

1. Cohérence interne (`validate:internal`) sur le cache agrégé.
2. Vérification référence (`verify:reference`) sur golden communes (Rennes 35238, Nantes 44109, …).
3. Classification des écarts (millésime vs bug parser).
4. Extension du workflow CI `refresh-cache.yml`.
5. Agent Cursor sur échecs `PARSER_BUG` / `JOIN_KEY_ERROR`.

Pas de scraping web — liste blanche `lib/sources.ts` uniquement.

## Bonnes pratiques

- Toujours noter l'**URL**, la **licence** et la **date** de consultation d'un dataset
- Préférer les sources avec **API stable** ou **fichiers bulk** téléchargeables
- Ne jamais inventer de chiffres dans l'analyse IA — transmettre uniquement les faits ingérés
- Versionner les scripts d'ingestion, pas le cache (`data/cache/` est ignoré sauf `.gitkeep`)
