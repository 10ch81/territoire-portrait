import type { EditorialAnalysisOutput, TerritoryAnalysis } from "../../types";
import type { EditorialProfileId } from "../../types";
import { getEditorialProfile } from "./editorialProfiles";
import { isInventoryOnlyStrength } from "./editorialQualityGuards";

const GENERIC_RISK_OPPORTUNITY =
  /renforcer la prévention et l'adaptation aux risques naturels identifiés/i;

export function expectNoInventoryOnlyStrengths(editorial: EditorialAnalysisOutput): string[] {
  const violations: string[] = [];
  for (const strength of editorial.strengths) {
    if (isInventoryOnlyStrength(strength)) {
      violations.push(`strength inventaire: ${strength}`);
    }
  }
  return violations;
}

export function expectSummaryMentionsTerritorySignature(
  editorial: EditorialAnalysisOutput,
): string[] {
  const profile = getEditorialProfile(editorial.profileId);
  const matches = profile.summarySignatureKeywords.some((pattern) =>
    pattern.test(editorial.summary),
  );
  return matches ? [] : [`summary sans signature profil ${editorial.profileId}`];
}

export function expectOpportunitiesLinkStrengthAndWatchPoint(
  analysis: TerritoryAnalysis,
): string[] {
  const editorial = analysis.editorial;
  if (!editorial) {
    return ["editorial absent"];
  }

  const mvpStrengthText = analysis.strengths.join(" ").toLowerCase();
  const mvpWatchText = analysis.watchPoints.join(" ").toLowerCase();
  const violations: string[] = [];

  for (const opportunity of editorial.opportunities) {
    const mvpIndex = analysis.opportunities.indexOf(opportunity);
    if (mvpIndex >= 0 && analysis.opportunities[mvpIndex] === opportunity) {
      continue;
    }

    const lower = opportunity.toLowerCase();
    const linksStrength =
      /emploi|centralité|croissance|tourisme|équipements|connectivité/i.test(lower) &&
      (mvpStrengthText.length > 0 || editorial.strengths.length > 0);
    const linksWatch =
      /risque|sécurité|chômage|quartiers|finances|logement|prudence/i.test(lower) &&
      (mvpWatchText.length > 0 || editorial.watchPoints.length > 0);

    if (!linksStrength || !linksWatch) {
      violations.push(`opportunité peu ancrée: ${opportunity}`);
    }
  }

  return violations;
}

export function expectNoGenericRiskOpportunityIfNotSalient(
  analysis: TerritoryAnalysis,
): string[] {
  const hasRiskWatch = analysis.watchPoints.some((item) =>
    /risques? naturels|CATNAT|inondation/i.test(item),
  );
  if (hasRiskWatch) {
    return [];
  }

  const editorial = analysis.editorial;
  if (!editorial) {
    return [];
  }

  return editorial.opportunities
    .filter((item) => GENERIC_RISK_OPPORTUNITY.test(item))
    .map((item) => `opportunité risque générique: ${item}`);
}

export function expectAtLeastOneProfileSpecificFact(analysis: TerritoryAnalysis): string[] {
  const editorial = analysis.editorial;
  if (!editorial) {
    return ["editorial absent"];
  }

  const hasDistinctStrength = editorial.strengths.some(
    (item, index) => item !== analysis.strengths[index],
  );
  const hasDistinctSummary = editorial.summary !== analysis.summary;

  if (hasDistinctStrength || hasDistinctSummary) {
    return [];
  }

  return ["aucune reformulation éditoriale distincte du MVP"];
}

export type EditorialEvalResult = {
  profileId: EditorialProfileId;
  commune: string;
  inseeCode: string;
  passed: boolean;
  violations: string[];
};

export function runEditorialEval(
  commune: string,
  inseeCode: string,
  analysis: TerritoryAnalysis,
  profileId: EditorialProfileId,
): EditorialEvalResult {
  const violations = [
    ...expectNoInventoryOnlyStrengths(analysis.editorial ?? {
      profileId,
      summary: "",
      strengths: [],
      watchPoints: [],
      opportunities: [],
    }),
    ...expectSummaryMentionsTerritorySignature(
      analysis.editorial ?? {
        profileId,
        summary: analysis.summary,
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
    ),
    ...expectOpportunitiesLinkStrengthAndWatchPoint(analysis),
    ...expectNoGenericRiskOpportunityIfNotSalient(analysis),
    ...expectAtLeastOneProfileSpecificFact(analysis),
  ];

  return {
    profileId,
    commune,
    inseeCode,
    passed: violations.length === 0,
    violations,
  };
}
