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
- [ ] Comparaison de communes (phase 2 — page `/compare` à venir)

## Sprint 5 — Qualité des données

- [x] `lib/quality/rules.ts` — cohérence interne (densité, dérivés, bornes)
- [x] `scripts/validate-internal.ts` — validation du cache agrégé
- [x] `scripts/verify-reference.ts` — golden communes vs APIs live
- [x] Classification des écarts (`MILLESIME_DIFF`, `PARSER_BUG`, …)
- [x] Extension CI `refresh-cache.yml` (validate + verify avant commit)
- [x] Rapport `data/quality/latest.json`
- [x] Guide automation Cursor (`docs/automation-data-quality.md`)

Référence : [docs/data-quality.md](./data-quality.md).

---

## Principes directeurs

1. **Ne jamais inventer de données** — conserver « Donnée non disponible »
2. **Sources traçables** — lien contextuel par section + liste globale
3. **Qualité vérifiable** — boucle validate / verify documentée (`docs/data-quality.md`)
4. **Analyse IA prudente** — synthèse après les faits, limites explicites
5. **Progressive disclosure** — KPIs → synthèse → détail par onglet/ancre
6. **Pas de sur-ingénierie** — SVG natif pour les graphiques, pas de carte interactive lourde

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

## Référence agent

Voir aussi `AGENTS.md` — section « UX ».
