import { isMistralConfigured } from "@/lib/mistral";
import type { TerritoryProfile } from "@/lib/types";
import { buildPortraitHybridPayload } from "./build-portrait-payload";
import { parsePortraitContent } from "./parse-portrait";
import type { PortraitGenerationResult } from "./types";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const PORTRAIT_MODEL = "mistral-large-latest";

const SYSTEM_PROMPT =
  "Tu es un rédacteur territorial. Tu reçois des données publiques sur une commune française. Rédige un portrait en un titre suivi de exactement 10 paragraphes. N'invente pas de chiffres absents des données fournies, mais tu peux interpréter et relier les faits. Signale implicitement les lacunes si des thèmes manquent.";

function buildUserPrompt(territory: TerritoryProfile): string {
  const payload = buildPortraitHybridPayload(territory);

  return `Voici les données disponibles sur la commune, au format hybride mêlant JSON structuré et libellés lisibles.

${payload}

Utilise ces données pour dresser un portrait narratif de la commune en un titre suivi de exactement 10 paragraphes.`;
}

function getApiKey(): string | null {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  return apiKey ?? null;
}

export async function generatePortraitNarrative(
  territory: TerritoryProfile,
): Promise<PortraitGenerationResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      portrait: null,
      error: "Portrait narratif non configuré (MISTRAL_API_KEY absente).",
    };
  }

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: PORTRAIT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(territory) },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Erreur Mistral portrait:", response.status, errorBody);
      return {
        portrait: null,
        error: `La génération du portrait a échoué (statut ${response.status}).`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return {
        portrait: null,
        error: "Réponse Mistral vide ou inattendue.",
      };
    }

    const portrait = parsePortraitContent(content);

    if (!portrait.title.trim() && portrait.paragraphs.length === 0) {
      return {
        portrait: null,
        error: "Le portrait généré est vide.",
      };
    }

    return { portrait };
  } catch (error) {
    console.error("Erreur lors de l'appel Mistral portrait:", error);
    return {
      portrait: null,
      error: "Erreur réseau lors de la génération du portrait.",
    };
  }
}

export function isPortraitNarrativeAvailable(): boolean {
  return isMistralConfigured();
}

export const portraitNarrativeModel = PORTRAIT_MODEL;
