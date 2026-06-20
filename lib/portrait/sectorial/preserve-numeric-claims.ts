import type { QualifiedAnalysisFact } from "@/lib/analysis/types";
import type { PortraitNarrative } from "../types";

function normalizeNumericToken(value: string): string {
  return value.replace(/\s/g, "").replace(",", ".");
}

function extractNumericTokens(text: string): string[] {
  const tokens: string[] = [];
  const patterns = [
    /\d[\d\s\u202f]*(?:[.,]\d+)?\s*%/g,
    /\d[\d\s\u202f]*(?:[.,]\d+)?\s*€/g,
    /\d[\d\s\u202f]+/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const token = match[0]?.trim();
      if (token) {
        tokens.push(normalizeNumericToken(token));
      }
    }
  }

  return [...new Set(tokens)];
}

function bindingPresentInText(value: number | string, text: string): boolean {
  const normalizedText = normalizeNumericToken(text);
  const raw = String(value);
  if (normalizedText.includes(normalizeNumericToken(raw))) {
    return true;
  }

  if (typeof value === "number") {
    const formatted = value.toLocaleString("fr-FR");
    if (text.includes(formatted)) {
      return true;
    }
    const rounded = Math.round(value).toLocaleString("fr-FR");
    if (text.includes(rounded)) {
      return true;
    }
  }

  return false;
}

export function polishedPortraitPreservesNumericClaims(
  original: PortraitNarrative,
  polished: PortraitNarrative,
  facts: QualifiedAnalysisFact[],
): boolean {
  const factIds = new Set(
    (original.sectors ?? []).flatMap((sector) => sector.factIds),
  );
  const boundFacts = facts.filter((fact) => factIds.has(fact.id));

  for (const fact of boundFacts) {
    for (const binding of fact.numericBindings ?? []) {
      const polishedText = polished.paragraphs.join(" ");
      if (!bindingPresentInText(binding.value, polishedText)) {
        return false;
      }
    }
  }

  const originalTokens = extractNumericTokens(original.paragraphs.join(" "));
  const polishedText = polished.paragraphs.join(" ");

  return originalTokens.every((token) => {
    if (token.length < 2) {
      return true;
    }
    return normalizeNumericToken(polishedText).includes(token);
  });
}
