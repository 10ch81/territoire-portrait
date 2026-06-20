import type { PortraitNarrative } from "../types";
import { parsePortraitContent } from "../parse-portrait";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const POLISH_MODEL = "mistral-large-latest";

const POLISH_SYSTEM_PROMPT = `Tu reformules des paragraphes de portrait territorial pré-rédigés.
Règles strictes :
- Conserve tous les chiffres à l'identique.
- N'ajoute aucun fait, comparaison, tendance ni interprétation.
- Ton descriptif et contrasté, sans métaphore.
- Un paragraphe par rubrique, même ordre.
- Retourne uniquement le titre sur la première ligne, puis les paragraphes séparés par une ligne vide.`;

function buildPolishUserPrompt(portrait: PortraitNarrative): string {
  const sectors = portrait.sectors ?? [];
  const body = sectors
    .map((sector) => `[${sector.index}. ${sector.title}]\n${sector.paragraph}`)
    .join("\n\n");

  return `Titre : ${portrait.title}

${body}

Reformule légèrement pour fluidifier, sans modifier les faits.`;
}

function getApiKey(): string | null {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  return apiKey ?? null;
}

export function isPortraitMistralPolishEnabled(): boolean {
  return process.env.PORTRAIT_MISTRAL_POLISH === "true";
}

export async function polishPortraitWithMistral(
  portrait: PortraitNarrative,
): Promise<PortraitNarrative | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: POLISH_MODEL,
        messages: [
          { role: "system", content: POLISH_SYSTEM_PROMPT },
          { role: "user", content: buildPolishUserPrompt(portrait) },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return null;
    }

    const parsed = parsePortraitContent(content);
    if (parsed.paragraphs.length !== portrait.paragraphs.length) {
      return null;
    }

    const sectors = portrait.sectors?.map((sector, index) => ({
      ...sector,
      paragraph: parsed.paragraphs[index] ?? sector.paragraph,
    }));

    return {
      ...portrait,
      title: parsed.title.trim() || portrait.title,
      paragraphs: parsed.paragraphs,
      sectors,
      generatedBy: "mistral_polish",
    };
  } catch {
    return null;
  }
}
