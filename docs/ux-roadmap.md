# Feuille de route UX — Portrait de territoire

Document de référence pour l'évolution de l'expérience utilisateur.  
Statut des sprints : voir cases cochées dans les titres au fil de l'implémentation.

## Diagnostic (état initial MVP)

### Points forts
- Parcours clair : recherche → fiche → sources
- Dégradation gracieuse (Mistral absent, données manquantes)
- Ton sobre et crédible

### Frictions identifiées
1. **Mur de données** — `EnrichmentCard` empilait ~10 thématiques sans navigation ; doublons avec `TerritoryCard`
2. **Analyse IA noyée** — synthèse Mistral après des centaines de lignes
3. **Chargement opaque** — page commune bloquante (enrichissement + IA)
4. **Recherche basique** — pas d'autocomplétion, pas d'historique
5. **Données temporelles en listes** — historiques population / DVF sans visualisation

---

## Sprint 1 — Restructuration de la fiche

- [x] Bandeau **KPI hero** (population, densité, croissance, prix m², rang EPCI, équipements/1 000 hab.)
- [x] **Remonter l'analyse IA** juste après les KPIs
- [x] **Navigation par sections** (ancres sticky : Démographie, Économie, Équipements…)
- [x] Scinder `EnrichmentCard` en sous-composants thématiques
- [x] **Indicateur de complétude** (« X/Y sources disponibles »)
- [x] Supprimer les doublons identité / chiffres clés redondants

## Sprint 2 — Recherche et chargement

- [x] **Autocomplétion** avec debounce sur `/api/commune`
- [x] Libellé bouton « Voir la fiche » (au lieu de « Analyser »)
- [x] **Communes récentes** (`localStorage`, 5 max)
- [x] **Exemples cliquables** sur l'accueil
- [x] Homonymes enrichis (département + population)
- [x] **Chargement progressif** : fiche visible sans attendre Mistral
- [x] **Analyse IA côté client** via `POST /api/analyze`
- [x] Skeletons / `loading.tsx` route commune
- [x] **Badges de fraîcheur** par section (millésime source)

## Sprint 3 — Visualisations et confiance

- [x] Courbe **évolution population** (`populationHistory`)
- [x] Sparkline / barres **prix DVF** (`property.priceHistory`)
- [x] **Pyramide des âges** (`sociodemographics.ageBands`)
- [x] Jauge **comparaison EPCI** (densité / population vs moyenne)
- [x] **Tooltips acronymes** (BPE, RPLS, IRVE, DVF, AAV, REI, ESS, RGE…)
- [x] Encadré **limites IA** renforcé dans `AiAnalysis`

## Sprint 4 — Actions et accueil

- [x] **Copier le lien** + **Impression / PDF** (`@media print`)
- [x] Accueil orienté **cas d'usage** (élus, prospecteurs, risques)
- [x] Comparaison de communes (phase 2 — page `/compare`, scénario 1 MVP)
- [x] Vue **synthèse particulier** sur fiche commune (6 blocs, 28 indicateurs)
- [x] Moteur **communes comparables** (profil + département + population ±30 %)
- [x] Modèle **PublicIndicator** (scale, sensitive, alertes de lecture)
- [x] Ingestion RP logement enrichie (propriétaires, résidences secondaires) — `ingest:housing`
- [x] Rangs départementaux précalculés (6 indicateurs clés) — `ingest:department-ranks`
- [x] Accessibilité comparateur (RGAA) — tableaux structurés, légendes, navigation blocs, impression lisible
- [x] Indicateurs accessibilité santé comparateur — APL DREES + population éloignée soins > 20 min (OT) ; centralités OT en attente API producteur

## Scénario 3 — Plateforme sémantique (amorcé)

- [x] Personnalisation profils utilisateur (`priorites=` + localStorage) sur `/compare`
- [x] API catalogue indicateurs publics — `GET /api/indicators/catalog`
- [x] BAN / géocodage adresse — recherche accueil et comparateur via `/api/commune`
- [x] Export JSON-LD par commune — `GET /api/commune/[codeInsee]/jsonld` (indicateurs + sources, sans ontologie lourde)
- [x] Export JSON-LD comparateur — `GET /api/compare/jsonld?codes=…&priorites=…`
- [x] Questionnaire « Où habiter ? » — profil utilisateur → `priorites=` + comparateur exemple
- [x] Parcours complet « Où habiter ? » — commune de départ (récente/recherche) → comparables → `/compare`

## Sprint 5 — Qualité des données

- [x] `lib/quality/rules.ts` — cohérence interne (densité, dérivés, bornes)
- [x] `scripts/validate-internal.ts` — validation du cache agrégé
- [x] `scripts/verify-reference.ts` — golden communes vs APIs live
- [x] Classification des écarts (`MILLESIME_DIFF`, `PARSER_BUG`, …)
- [x] Extension CI `refresh-cache.yml` (validate + verify avant commit)
- [x] Rapport `data/quality/latest.json`
- [x] Guide automation Cursor (`docs/automation-data-quality.md`)

Référence : [docs/data-quality.md](./data-quality.md).

## Sprint 6 — Enrichissement sources (données)

Référence détaillée : [docs/mcp-datagouv.md](./mcp-datagouv.md) (matrice sources × thèmes, niveaux R/C/S, roadmap P1–P3).

### P1 — Socle diagnostic

- [ ] GTFS transport collectif — **reporté** (ingestion nationale trop lourde ; RP domicile-travail + BPE domaine E)
- [x] SIG Ville / QPV (politique de la ville)
- [x] RP logement 2022 (vacance générale, parc total)
- [x] RP mobilité domicile-travail (modes de transport des actifs)

### P2 — Enrichissement

- [x] INSEE SIDE (démographie d'entreprises) + SIRENE API
- [x] France Services
- [x] Annuaire de l'Éducation — agrégats communaux (`ingest-education.ts`)
- [x] FLORES A17 — emploi salarié par secteur (`ingest-flores.ts`)
- [x] ARCEP — couverture fibre (`ingest-fibre.ts`)
- [x] FINESS — établissements sanitaires et sociaux (`ingest-finess.ts`)
- [x] APL santé (DREES) — `ingest-apl.ts` → `healthcare-access.ts` (xlsx national MG, comparateur)
- [ ] BANATIC — **reporté** (pas de JSON public par commune)
- [x] OFGL (dette, recettes — API live, pas bulk)
- [ ] PPRN régionaux — **reporté**

### P3 — Complémentaire

- [ ] DVF+ — **reporté**
- [x] Capacités touristiques INSEE
- [ ] DATAtourisme — **reporté** (INSEE suffit)
- [ ] GTFS national — **reporté** (trop lourd)
- [ ] Artificialisation des sols — **écarté**
- [x] Observatoire des territoires — `ingest-observatoire-access.ts` (santé > 20 min ✅ ; centralités ⚠️ API OT indisponible)

---

## UX multi-audience (décision 2026-06-27)

**Décision figée et plan d'exécution :** [docs/ux-multi-audience.md](./ux-multi-audience.md)

Principe : *une plateforme de données, plusieurs lentilles de lecture* (intentions + niveaux + URL partageable). Options A–H validées ; exécution en sprints 7–9 ci-dessous.

## Sprint 7 — Intent-first & fiche 3 niveaux (Phase 1)

- [x] Catalogue intentions — `lib/ux/intents.ts`
- [x] Accueil intent-first — `components/IntentCards.tsx`, `app/page.tsx`
- [x] Fiche `vue=synthese|analyse|sources` (alias `particulier`/`detail`) — toggle + page commune
- [x] Persistance vue — `lib/ux/commune-view-store.ts`
- [x] Vue Sources (L3) — `components/commune/CommuneSourcesView.tsx`
- [x] Profils compare collectivité — `fiscalite`, `collectivite`, `implantation` dans `lib/compare/profiles.ts`

## Sprint 8 — Benchmark, confiance, export élu (Phase 2)

- [x] Param URL `benchmark=` — `lib/ux/benchmark.ts` ; écarts KPI hero et highlights
- [x] Panneau traçabilité indicateur — `components/IndicatorProvenance.tsx`
- [x] Export PDF « fiche conseil » — styles print + `CommuneExportActions`
- [x] IA contextualisée (promotion portrait narratif en `vue=analyse`)
- [x] Enrichissement `comparisonHint` / `readingAlert` sur catalogue indicateurs

## Sprint 9 — Wizards, CSV, catalogue audience (Phase 3)

- [x] Wizard benchmark collectivité — `CollectivityBenchmarkWizard`
- [x] Wizard implantation pro — `ImplantationWizard`
- [x] Export CSV — `GET /api/commune/[codeInsee]/indicators.csv`
- [x] Filtre `?audience=` sur `/api/indicators/catalog`
- [x] Doc README « Réutiliser les données »

---

## Principes directeurs

1. **Ne jamais inventer de données** — conserver « Donnée non disponible »
2. **Sources traçables** — lien contextuel par section + liste globale
3. **Qualité vérifiable** — boucle validate / verify documentée (`docs/data-quality.md`)
4. **Analyse IA prudente** — synthèse après les faits, limites explicites
5. **Progressive disclosure** — Synthèse → Analyse → Sources (+ KPIs hero)
6. **Pas de sur-ingénierie** — SVG natif pour les graphiques, pas de carte interactive lourde
7. **Lentilles, pas silos** — intentions et niveaux URL ; un catalogue `PublicIndicator`

## À éviter (hors scope actuel)

- Carte interactive Leaflet/Mapbox
- Dashboard configurable multi-widgets
- Chat IA libre (risque d'hallucination)
- Design system complet — extraire `KpiCard`, `DataSection`, `SectionNav` suffit

## Fichiers clés

| Fichier | Rôle |
| -------- | ----- |
| `lib/ux/kpis.ts` | Extraction KPI hero |
| `lib/ux/completeness.ts` | Score complétude des sources |
| `lib/quality/` | Validation qualité (planifié — voir `docs/data-quality.md`) |
| `lib/ux/sections.ts` | Définition des ancres de navigation |
| `lib/ux/acronyms.ts` | Glossaire acronymes |
| `components/KpiHero.tsx` | Bandeau indicateurs |
| `components/SectionNav.tsx` | Navigation sticky |
| `components/enrichment/*` | Sections thématiques |
| `components/charts/*` | Visualisations SVG |
| `components/AiAnalysisClient.tsx` | Analyse IA asynchrone |
| `components/SearchForm.tsx` | Recherche enrichie |
| `lib/ux/intents.ts` | Intentions accueil (Sprint 7) |
| `lib/ux/benchmark.ts` | Référence comparative URL (Sprint 8) |
| `components/IntentCards.tsx` | Cartes intent-first (Sprint 7) |
| `components/commune/CommuneSourcesView.tsx` | Niveau Sources fiche (Sprint 7) |
| `docs/ux-multi-audience.md` | Décision multi-audience & plan détaillé |

## Référence agent

Voir aussi `AGENTS.md` — section « UX ».
