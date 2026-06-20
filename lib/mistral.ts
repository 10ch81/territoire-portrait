import {
  buildAnalysisFacts,
  buildCanonicalAnalysisOutput,
  buildExpectedOutputInstructions,
  buildMistralStructureBlock,
  enforceFinalAnalysisInvariants,
  selectAnalysisFactsForPrompt,
  validateAnalysisOutput,
} from "./analysis";
import { buildEditorialLayer, buildFinalTerritorialAnalysis } from "./analysis/evaluation-helpers";
import { computeDataLimits } from "./data-limits";
import { buildTerritorialFacts } from "./mistral-facts";
import { mergeSanitizedAnalysis } from "./mistral-sanitize";
import type { AnalysisResult, TerritoryAnalysis, TerritoryProfile } from "./types";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un rédacteur territorial spécialisé dans les communes françaises.

Tu reçois des constats territoriaux prévalidés côté serveur dans analysisFacts et une sortie canonique dans canonicalOutput.

Règles impératives :
- Tu dois produire uniquement un objet JSON valide.
- Tu ne dois utiliser que les constats présents dans analysisFacts et canonicalOutput.
- Ne mentionne jamais les règles internes, les noms de fonctions, les mots facts, analysisFacts, numericBindings, sanitize, JSON dans les textes produits.

Résumé (summary) :
- Retourner canonicalOutput.summary à l'identique, sans aucune modification.

Listes (strengths, watchPoints, opportunities) :
- Tu peux uniquement réordonner les phrases de canonicalOutput.
- Tu peux condenser légèrement ou harmoniser le style, sans changer les chiffres, les années, les sources entre parenthèses, les acronymes (SSMSI, FLORES, CATNAT, ARCEP, INSEE, BPE, etc.) ni les substantifs techniques.
- Si une phrase contient un chiffre ou une source, elle doit rester quasi identique au constat serveur correspondant.
- Interdit de calculer ou d'inventer un ratio (ex. « 50 postes pour 100 habitants ») absent des constats.
- Produire exactement autant d'entrées que de constats par rubrique (instructions.expectedOutput), sans en omettre ni fusionner deux thèmes distincts.
- Sécurité (SSMSI) et risques naturels (CATNAT) restent des entrées séparées.

Opportunités :
- Formuler des pistes d'action prudentes, pas des certitudes ni des demandes d'étude.

${buildMistralStructureBlock()}`;

function emptyAnalysis(territory: TerritoryProfile): TerritoryAnalysis {
  return enforceFinalAnalysisInvariants({
    summary: "",
    strengths: [],
    watchPoints: [],
    opportunities: [],
    dataLimits: computeDataLimits(territory),
  });
}

function isTerritorialAnalysisInsufficient(analysis: TerritoryAnalysis): boolean {
  return (
    analysis.summary.trim().length === 0 &&
    analysis.strengths.length === 0 &&
    analysis.watchPoints.length === 0 &&
    analysis.opportunities.length === 0
  );
}

function buildCanonicalTerritoryAnalysis(territory: TerritoryProfile): TerritoryAnalysis {
  return buildFinalTerritorialAnalysis(territory).analysis;
}

function buildDegradedAnalysisResult(
  territory: TerritoryProfile,
  options: {
    configured: boolean;
    error?: string;
  },
): AnalysisResult {
  const canonicalAnalysis = buildCanonicalTerritoryAnalysis(territory);

  if (isTerritorialAnalysisInsufficient(canonicalAnalysis)) {
    return {
      analysis: emptyAnalysis(territory),
      configured: options.configured,
      llmUsed: false,
      degraded: true,
      error: options.error,
    };
  }

  return {
    analysis: canonicalAnalysis,
    configured: options.configured,
    llmUsed: false,
    degraded: true,
    error: options.error,
  };
}

function getMistralConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model: process.env.MISTRAL_MODEL?.trim() || "mistral-small-latest",
  };
}

function buildUserPrompt(territory: TerritoryProfile): string {
  const analysisFacts = getSelectedAnalysisFacts(territory);
  const canonicalOutput = buildCanonicalAnalysisOutput(territory, analysisFacts);
  const debug = process.env.ANALYSIS_DEBUG_RAW_FACTS === "true";

  const payload = {
    commune: {
      nom: territory.name,
      codeInsee: territory.inseeCode,
      departement: territory.department,
      region: territory.region,
      epci: territory.epci,
    },
    analysisFacts,
    canonicalOutput,
    instructions: {
      outputFormat: "json",
      allowedKeys: ["summary", "strengths", "watchPoints", "opportunities"],
      expectedOutput: buildExpectedOutputInstructions(analysisFacts),
      summaryPolicy: "Retourner canonicalOutput.summary sans modification.",
      listPolicy:
        "Réordonner uniquement les listes de canonicalOutput ; conserver chiffres, sources et substantifs techniques.",
    },
    ...(debug ? { rawFacts: buildTerritorialFacts(territory) } : {}),
  };

  return JSON.stringify(payload, null, 2);
}

function getSelectedAnalysisFacts(territory: TerritoryProfile) {
  const allFacts = buildAnalysisFacts(territory);
  return selectAnalysisFactsForPrompt(allFacts, territory);
}

function parseAnalysisContent(
  content: string,
  territory: TerritoryProfile,
):
  | { ok: true; analysis: TerritoryAnalysis }
  | { ok: false; error: string } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      ok: false,
      error: "Réponse Mistral invalide (JSON mal formé).",
    };
  }

  const selectedFacts = getSelectedAnalysisFacts(territory);
  const validated = validateAnalysisOutput(
    parsed as Parameters<typeof validateAnalysisOutput>[0],
    selectedFacts,
    territory,
  );

  const merged = mergeSanitizedAnalysis(validated, computeDataLimits(territory));

  return {
    ok: true,
    analysis: enforceFinalAnalysisInvariants({
      ...merged,
      editorial: buildEditorialLayer(territory, selectedFacts, validated.summary),
    }),
  };
}

export function isMistralConfigured(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY?.trim());
}

function getMissingApiKeyMessage(): string {
  if (process.env.VERCEL) {
    return (
      "La synthèse territoriale n'est pas configurée sur ce déploiement Vercel. " +
      "Vérifiez que MISTRAL_API_KEY est définie pour l'environnement Production " +
      "(ou Preview), puis redéployez le projet."
    );
  }

  return (
    "La synthèse territoriale n'est pas configurée en local. " +
    "Ajoutez MISTRAL_API_KEY dans .env.local, ou exécutez « npx vercel env pull .env.local » " +
    "après avoir ajouté la clé à l'environnement Development sur Vercel."
  );
}

export async function analyzeTerritory(
  territory: TerritoryProfile,
): Promise<AnalysisResult> {
  const config = getMistralConfig();

  if (!config) {
    return buildDegradedAnalysisResult(territory, {
      configured: false,
      error: getMissingApiKeyMessage(),
    });
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
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Erreur Mistral:", response.status, errorBody);
      return buildDegradedAnalysisResult(territory, {
        configured: true,
        error: `La synthèse territoriale a échoué (statut ${response.status}). Vérifiez la clé API et le modèle.`,
      });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return buildDegradedAnalysisResult(territory, {
        configured: true,
        error: "Réponse Mistral vide ou inattendue.",
      });
    }

    const parseResult = parseAnalysisContent(content, territory);

    if (!parseResult.ok) {
      return buildDegradedAnalysisResult(territory, {
        configured: true,
        error: parseResult.error,
      });
    }

    return {
      analysis: parseResult.analysis,
      configured: true,
      llmUsed: true,
      degraded: false,
    };
  } catch (error) {
    console.error("Erreur lors de l'appel Mistral:", error);
    return buildDegradedAnalysisResult(territory, {
      configured: true,
      error: "Erreur réseau lors de l'appel à l'API Mistral.",
    });
  }
}
