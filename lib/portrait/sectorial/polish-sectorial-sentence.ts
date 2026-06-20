const IMPERATIVE_OPPORTUNITY_PATTERN =
  /^(?:Mobiliser|Articuler|Renforcer|Valoriser|Réhabiliter|Faire|Mener)\b/i;

const INLINE_TECHNICAL_CAVEAT_PATTERNS = [
  /\s*\(nombre de types par domaine[^)]*\)/gi,
  /\s*\(ne recompose pas le total[^)]*\)/gi,
  /\s*;\s*ne pas fusionner les périmètres[^.]*\.?/gi,
  /\s*;\s*distinct de[^.]*\.?/gi,
];

export function isSectorialEligibleFact(fact: {
  target: string;
  sentence: string;
}): boolean {
  if (fact.target === "opportunities") {
    return false;
  }
  if (IMPERATIVE_OPPORTUNITY_PATTERN.test(fact.sentence.trim())) {
    return false;
  }
  return true;
}

export function polishSectorialSentence(sentence: string): string {
  let result = sentence.trim();
  for (const pattern of INLINE_TECHNICAL_CAVEAT_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
}
