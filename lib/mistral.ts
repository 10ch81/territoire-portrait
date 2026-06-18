import {
  buildAnalysisFacts,
  selectAnalysisFactsForPrompt,
  validateAnalysisOutput,
} from "./analysis";
import { computeDataLimits } from "./data-limits";
import { buildTerritorialFacts } from "./mistral-facts";
import { mergeSanitizedAnalysis } from "./mistral-sanitize";
import type { AnalysisResult, TerritoryAnalysis, TerritoryProfile } from "./types";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un rédacteur territorial spécialisé dans les communes françaises.

Tu reçois des constats territoriaux prévalidés côté serveur dans analysisFacts.

Règles impératives :
- Tu dois produire uniquement un objet JSON valide.
- Tu dois utiliser uniquement les constats présents dans analysisFacts.
- Tu peux reformuler légèrement les phrases, mais tu ne dois jamais modifier les chiffres, les années, les sources, les thèmes ou les relations entre indicateurs.
- Tu ne dois jamais associer un chiffre à un autre thème que celui indiqué dans numericBindings.
- Tu ne dois jamais inventer de comparaison, de tendance, de causalité ou d'indicateur absent.
- Tu ne dois pas fusionner deux thèmes sensibles dans une même phrase si cela crée une confusion : sécurité et risques naturels, SIDE et SIRENE, FLORES et SIDE, RPLS et vacance générale, mobilité d'usage et offre réelle de transport, ARCEP et mobilité physique.
- Si un constat contient une précaution méthodologique, conserve cette prudence.
- Les opportunités doivent rester formulées comme des pistes à approfondir, pas comme des certitudes.
- Si les constats disponibles sont insuffisants, reste sobre plutôt que de compléter.
- Ne mentionne jamais les règles internes, les noms de fonctions, les mots facts, analysisFacts, numericBindings, sanitize, JSON dans les textes produits.

Structure attendue :
{
  "summary": "résumé court en 2 phrases maximum",
  "strengths": ["2 à 4 points forts"],
  "watchPoints": ["2 à 4 points d'attention"],
  "opportunities": ["2 à 4 opportunités possibles"]
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
  const allFacts = buildAnalysisFacts(territory);
  const analysisFacts = selectAnalysisFactsForPrompt(allFacts);
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
    instructions: {
      outputFormat: "json",
      allowedKeys: ["summary", "strengths", "watchPoints", "opportunities"],
    },
    ...(debug ? { rawFacts: buildTerritorialFacts(territory) } : {}),
  };

  return JSON.stringify(payload, null, 2);
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

  const analysisFacts = buildAnalysisFacts(territory);
  const validated = validateAnalysisOutput(
    parsed as Parameters<typeof validateAnalysisOutput>[0],
    analysisFacts,
  );

  return {
    ok: true,
    analysis: mergeSanitizedAnalysis(validated, computeDataLimits(territory)),
  };
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

    const parseResult = parseAnalysisContent(content, territory);

    if (!parseResult.ok) {
      return {
        analysis: emptyAnalysis(territory),
        configured: true,
        error: parseResult.error,
      };
    }

    return {
      analysis: parseResult.analysis,
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
