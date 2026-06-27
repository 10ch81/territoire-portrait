import type { CompareQuestionId } from "@/lib/compare/types";

export type IndicatorAudienceTag = "citizen" | "collectivity" | "expert";

const COLLECTIVITY_QUESTIONS = new Set<CompareQuestionId>([
  "fiscal",
  "collectivity",
  "implantation",
  "dynamic",
  "territorial_context",
]);

const CITIZEN_QUESTIONS = new Set<CompareQuestionId>([
  "family",
  "housing",
  "socioeconomic",
  "equipped",
  "accessible",
]);

export function deriveIndicatorAudienceTags(
  questionIds: CompareQuestionId[],
): IndicatorAudienceTag[] {
  const tags = new Set<IndicatorAudienceTag>(["expert"]);

  if (questionIds.some((id) => COLLECTIVITY_QUESTIONS.has(id))) {
    tags.add("collectivity");
  }
  if (questionIds.some((id) => CITIZEN_QUESTIONS.has(id))) {
    tags.add("citizen");
  }

  return [...tags];
}

export function parseAudienceParam(raw: string | null): IndicatorAudienceTag | null {
  if (raw === "citizen" || raw === "collectivity" || raw === "expert") {
    return raw;
  }
  return null;
}

export function filterCatalogByAudience<T extends { audienceTags: IndicatorAudienceTag[] }>(
  entries: T[],
  audience: IndicatorAudienceTag | null,
): T[] {
  if (!audience) {
    return entries;
  }
  return entries.filter((entry) => entry.audienceTags.includes(audience));
}
