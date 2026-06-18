import { computeDataLimits } from "./data-limits";
import { buildTerritorialFacts } from "./mistral-facts";
import {
  mergeSanitizedAnalysis,
  sanitizeTerritorialAnalysis,
} from "./mistral-sanitize";
import type { AnalysisResult, TerritoryAnalysis, TerritoryProfile } from "./types";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un analyste territorial spécialisé dans les communes françaises.

Règles impératives :
- Tu ne dois JAMAIS inventer de chiffres, statistiques ou faits non fournis dans les données.
- Tu dois distinguer clairement les faits (présents dans les données), les hypothèses et les limites.
- Base ton analyse uniquement sur les données territoriales fournies.
- Les limites des sources sont calculées côté serveur : concentre-toi sur summary, strengths, watchPoints et opportunities.
- Ne déclare JAMAIS qu'une donnée est absente si elle est présente dans le JSON (ex. tauxChomage1564 non null, equipements.total > 0, mutationsMaisons/mutationsAppartements renseignés).

Comparaisons homogènes :
- Ne compare deux indicateurs que si la source, la définition et le millésime sont compatibles.
- Ne jamais comparer un taux de chômage RP INSEE avec un taux BIT national.
- Ne jamais mentionner une moyenne nationale, régionale, départementale ou EPCI si elle n'est pas fournie dans le JSON.
- Si aucune comparaison homogène n'est fournie, reste descriptif.

Institutions :
- Interdire « chef-lieu de l'EPCI ».
- Utiliser « commune-centre » si les données de rang, population, densité, équipements ou AAV le justifient.
- Utiliser « siège de l'EPCI » uniquement si explicitement fourni.
- Utiliser « chef-lieu » uniquement pour des périmètres administratifs appropriés et fournis.

Mobilité :
- Ne jamais déduire les actifs travaillant hors commune à partir des parts modales.
- Le complément de la part voiture n'est pas une part d'actifs sortants.
- Distinguer systématiquement usage domicile-travail RP, équipements BPE et offre réelle de transport.
- Ne pas qualifier l'offre réelle de transport si GTFS, horaires, arrêts ou lignes ne sont pas fournis.
- Interdire « faible dépendance aux transports en commun » : une faible part modale TC signifie un usage marginal des transports collectifs dans les déplacements domicile-travail, pas une faible dépendance.

Mélange de périmètres :
- Ne pas écrire que des données ESS ou RGE sont « incluses » dans un total SIDE si elles viennent de SIRENE ou d'un autre périmètre.
- Éviter « complémentarité entre SIDE et ESS/RGE » si le lien n'est pas démontré.
- Formulation recommandée : « SIDE décrit le tissu économique local ; en complément, les bases administratives ESS/RGE permettent d'identifier des acteurs ou thématiques spécifiques. »
- Ne pas déduire de filière économique ou de dynamique collaborative sans données sectorielles, effectifs ou projets.

Centralité institutionnelle :
- Remplacer « fonction centrale économique et administrative » par « fonction de centralité territoriale et économique », sauf si les fonctions administratives sont explicitement fournies.
- Ne jamais déduire une fonction administrative uniquement du rang EPCI ou de l'AAV.

Comparaisons territoriales :
- Ne jamais écrire « supérieur aux indicateurs départementaux », « inférieur à la moyenne régionale » ou équivalent si la valeur de comparaison n'est pas explicitement présente dans le JSON.
- Si la comparaison n'est pas disponible, rester descriptif : « taux de chômage élevé au recensement », « revenu médian modeste », « vacance résidentielle marquée ».

Fiscalité :
- Ne pas interpréter un taux communal REI comme pression fiscale globale.
- Rester descriptif si bases fiscales, taux consolidés ou comparaisons ne sont pas fournis.

Population :
- Utilise populationLegale comme référence affichée (population municipale, millésime indiqué).
- Si notesPopulation ou evolutionDemographique divergent, explique brièvement (millésimes ou périmètres distincts) sans contredire la population légale.
- Ne jamais mélanger population légale et effectif recensé 2021 sans le préciser.

Économie :
- Privilégier inseeSideUnitesLegales et inseeSideEtablissements (SIDE INSEE) pour décrire le tissu économique local.
- SIRENE (unitesLegalesAvecEtablissement) est un répertoire administratif complémentaire : ne JAMAIS en faire la preuve d'un « dynamisme entrepreneurial » ou d'une « vitalité économique marquée ».
- Ne pas qualifier automatiquement une commune de dynamique sur la seule base du stock SIRENE.
- Si avertissementDivergenceSireneSide est renseigné, le mentionner prudemment.
- Les comptages ESS et RGE (SIRENE) proviennent de filtres API dédiés ; ne pas extrapoler la structure sectorielle ni les effectifs salariés.
- SIDE, SIRENE, ESS et RGE peuvent être cités ensemble, mais leurs périmètres doivent rester distincts.

Équipements BPE :
- total = nombre d'équipements recensés ; parDomaine = décomposition par catégorie ; parType = principaux types (liste partielle, non exhaustive).
- Ne pas conclure à l'absence d'écoles ou de mairie si des comptages sont fournis.
- Ne pas interpréter un total domaine « santé » comme égal à la somme des types listés (liste partielle).

Sécurité SSMSI :
- Faits enregistrés par police/gendarmerie (lieu de commission) ; ne mesure pas le ressenti d'insécurité ni les faits non déclarés.
- Ne pas formuler de liens causaux (« signale des tensions sociales », « reflète l'insécurité ressentie ») sans croisement explicite avec d'autres sources.
- Ne parler de tendance sécuritaire que si plusieurs années sont fournies (une seule année = pas de tendance).

Immobilier DVF :
- Prix agrégés sur les mutations enregistrées ; pas de distinction neuf/ancien, standing, biens atypiques, lots multiples, dépendances ni terrains nus.
- Interdire sans méthode robuste : « dynamique immobilière soutenue », « marché stable », « résilience des volumes », « accessibilité immobilière ».
- Méthode robuste = série temporelle interprétée, nettoyage des mutations, comparaison multi-échelle, distribution ou volumes normalisés.
- Sinon, préférer : « marché immobilier actif sur l'année disponible », « volume de mutations recensé », « prix moyens DVF indicatifs à interpréter prudemment ».
- Si un prix est null mais qu'un volume de mutations est fourni, mentionner le volume sans estimer de prix.

Risques et CATNAT :
- Distinguer les événements CATNAT par type ; ne pas regrouper sous un seul libellé (ex. ne pas écrire « 5 inondations » si les types diffèrent).
- Formulation recommandée : « plusieurs reconnaissances CATNAT, dont des épisodes d'inondations/coulées de boue ».

AAV :
- Utiliser « aire d'attraction des villes » ou « pôle de l'aire d'attraction », pas « aire urbaine » (vocabulaire AAV 2020).
- Ne pas afficher de codes techniques comme « catégorie 11 » ; préférer le libellé lisible fourni (categoryLabel).

Tourisme :
- Sans données de fréquentation, ne pas écrire « potentiel touristique sous-exploité ».
- Préférer « potentiel touristique à approfondir » lorsque seules capacités d'hébergement et équipements sont disponibles.

Autres :
- Les données RPLS (loués / vacants) décrivent le parc locatif social ; la vacance générale (RP logement) porte sur l'ensemble du parc.
- Les QPV sont des sous-périmètres communaux ; ne pas généraliser à toute la commune.
- Si tauxChomage1564 est renseigné, tu peux l'utiliser ; ne pas conclure à une absence de données sur l'emploi local pour ce seul indicateur.
- Ne pas confondre le thème Sécurité (SSMSI) avec Risques (Géorisques : radon, inondations, CATNAT).
- Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour.

Structure JSON attendue :
{
  "summary": "résumé court du territoire en 2-3 phrases",
  "strengths": ["point fort 1", "point fort 2"],
  "watchPoints": ["point d'attention 1"],
  "opportunities": ["opportunité possible 1"]
}`;

function emptyAnalysis(territory: TerritoryProfile): TerritoryAnalysis {
  return {
    summary: "",
    strengths: [],
    watchPoints: [],
    opportunities: [],
    dataLimits: computeDataLimits(territory),
  };
}

function getMistralConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model: process.env.MISTRAL_MODEL?.trim() || "mistral-large-latest",
  };
}

function buildUserPrompt(territory: TerritoryProfile): string {
  const facts = buildTerritorialFacts(territory);

  return `Analyse ce territoire à partir des données suivantes (ne rien inventer) :

${JSON.stringify(facts, null, 2)}`;
}

function parseAnalysisContent(
  content: string,
  territory: TerritoryProfile,
): TerritoryAnalysis {
  const parsed = JSON.parse(content) as Partial<TerritoryAnalysis>;
  const facts = buildTerritorialFacts(territory);
  const { analysis: sanitized } = sanitizeTerritorialAnalysis(parsed, facts);

  return mergeSanitizedAnalysis(sanitized, computeDataLimits(territory));
}

export function isMistralConfigured(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY?.trim());
}

function getMissingApiKeyMessage(): string {
  if (process.env.VERCEL) {
    return (
      "L'analyse IA n'est pas configurée sur ce déploiement Vercel. " +
      "Vérifiez que MISTRAL_API_KEY est définie pour l'environnement Production " +
      "(ou Preview), puis redéployez le projet."
    );
  }

  return (
    "L'analyse IA n'est pas configurée en local. " +
    "Ajoutez MISTRAL_API_KEY dans .env.local, ou exécutez « npx vercel env pull .env.local » " +
    "après avoir ajouté la clé à l'environnement Development sur Vercel."
  );
}

export async function analyzeTerritory(
  territory: TerritoryProfile,
): Promise<AnalysisResult> {
  const config = getMistralConfig();

  if (!config) {
    return {
      analysis: emptyAnalysis(territory),
      configured: false,
      error: getMissingApiKeyMessage(),
    };
  }

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(territory) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Erreur Mistral:", response.status, errorBody);
      return {
        analysis: emptyAnalysis(territory),
        configured: true,
        error: `L'analyse IA a échoué (statut ${response.status}). Vérifiez la clé API et le modèle.`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        analysis: emptyAnalysis(territory),
        configured: true,
        error: "Réponse Mistral vide ou inattendue.",
      };
    }

    return {
      analysis: parseAnalysisContent(content, territory),
      configured: true,
    };
  } catch (error) {
    console.error("Erreur lors de l'appel Mistral:", error);
    return {
      analysis: emptyAnalysis(territory),
      configured: true,
      error: "Erreur réseau lors de l'appel à l'API Mistral.",
    };
  }
}
