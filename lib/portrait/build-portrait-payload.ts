import { resolveDisplayTypologyLabel } from "@/lib/analysis/context/displayTypologyLabel";
import { buildTerritorialFacts } from "@/lib/mistral-facts";
import { formatPopulation } from "@/lib/territory";
import { extractHeroKpis } from "@/lib/ux/kpis";
import { getPopulationDisplayMeta } from "@/lib/ux/population";
import {
  formatComparisonProfile,
  formatTypologyFamilyLabel,
  formatUrbanUnitRole,
  hasTypologyContent,
  listActivePublicPolicies,
} from "@/lib/ux/typology-display";
import { formatDensity } from "@/lib/enrichment";
import type { TerritoryProfile } from "@/lib/types";
import { stripEmpty } from "./strip-empty";

const EXCLUDED_FACT_KEYS = new Set(["sources", "coordonnees"]);

function buildPortraitStructuredData(territory: TerritoryProfile): Record<string, unknown> {
  const facts = buildTerritorialFacts(territory);
  const structured: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(facts)) {
    if (EXCLUDED_FACT_KEYS.has(key)) {
      continue;
    }
    structured[key] = value;
  }

  if (structured.geographie && typeof structured.geographie === "object") {
    const geographie = {
      ...(structured.geographie as Record<string, unknown>),
    };
    delete geographie.centraliteTerritoriale;
    structured.geographie = geographie;
  }

  const enrichment = territory.enrichment;
  const supplementary: Record<string, unknown> = {};

  if (enrichment?.labourMarket?.available) {
    supplementary.demandeEmploiFranceTravail = {
      trimestre: enrichment.labourMarket.quarter,
      inscritsTotal: enrichment.labourMarket.totalJobSeekers,
      categorieA: enrichment.labourMarket.categoryA,
      moins25Ans: enrichment.labourMarket.under25,
      cinquanteAnsEtPlus: enrichment.labourMarket.age50AndOver,
      longueDuree: enrichment.labourMarket.longTerm,
    };
  }

  if (enrichment?.socialBenefits?.available) {
    supplementary.prestationsSociales = {
      millesimeRsa: enrichment.socialBenefits.rsaVintage,
      partMenagesAllocatairesRsa:
        enrichment.socialBenefits.rsaShareAmongHouseholdsPercent,
    };
  }

  const education = enrichment?.education;
  if (education?.averageIps !== null && education?.averageIps !== undefined) {
    supplementary.indicePositionSociale = {
      anneeScolaire: education.ipsSchoolYear,
      ipsMoyen: education.averageIps,
      ecolesAvecIps: education.schoolsWithIps,
      ipsMin: education.ipsMin,
      ipsMax: education.ipsMax,
    };
  }

  const typology = enrichment?.territoryTypology;
  if (hasTypologyContent(typology)) {
    supplementary.typologieTerritoriale = stripEmpty({
      contexteAffiche: resolveDisplayTypologyLabel(territory),
      profilComparaison: formatComparisonProfile(typology!.comparisonProfile),
      famillesActives: typology!.availableFamilies.map((family) =>
        formatTypologyFamilyLabel(family),
      ),
      grilleDensite: typology!.densityGrid?.available
        ? typology!.densityGrid.levelLabel
        : undefined,
      uniteUrbaine: typology!.urbanUnit?.available
        ? {
            nom: typology!.urbanUnit.unitLabel,
            role: formatUrbanUnitRole(typology!.urbanUnit.role),
          }
        : undefined,
      dispositifsPublics: listActivePublicPolicies(
        typology!.publicPolicyTypologies,
      ),
    });
  }

  if (Object.keys(supplementary).length > 0) {
    structured.supplementaire = supplementary;
  }

  return stripEmpty(structured) ?? {};
}

function formatOptionalLabel(
  label: string,
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }
  return `- ${label} : ${value}`;
}

export function buildPortraitLabelsText(territory: TerritoryProfile): string {
  const populationMeta = getPopulationDisplayMeta(territory);
  const identityLines = [
    formatOptionalLabel("Commune", territory.name),
    formatOptionalLabel("Code INSEE", territory.inseeCode),
    territory.postalCodes.length > 0
      ? formatOptionalLabel("Codes postaux", territory.postalCodes.join(", "))
      : null,
    territory.department
      ? formatOptionalLabel(
          "Département",
          `${territory.department.name} (${territory.department.code})`,
        )
      : null,
    territory.region
      ? formatOptionalLabel(
          "Région",
          `${territory.region.name} (${territory.region.code})`,
        )
      : null,
    territory.epci
      ? formatOptionalLabel(
          "EPCI",
          `${territory.epci.name} (${territory.epci.code})`,
        )
      : null,
    formatOptionalLabel(populationMeta.label, formatPopulation(territory.population)),
    formatOptionalLabel("Densité", formatDensity(territory.densityPerKm2)),
    territory.surfaceKm2 !== null
      ? formatOptionalLabel(
          "Surface",
          `${territory.surfaceKm2.toLocaleString("fr-FR")} km²`,
        )
      : null,
  ].filter(Boolean);

  const kpiLines = extractHeroKpis(territory).map((kpi) => {
    const hint = kpi.hint ? ` (${kpi.hint})` : "";
    return `- ${kpi.label} : ${kpi.value}${hint}`;
  });

  return [
    "Identité",
    ...identityLines,
    "",
    "KPI principaux",
    ...(kpiLines.length > 0 ? kpiLines : ["- Aucun KPI principal disponible"]),
  ].join("\n");
}

export function buildPortraitHybridPayload(territory: TerritoryProfile): string {
  const labelsText = buildPortraitLabelsText(territory);
  const structured = buildPortraitStructuredData(territory);

  return `${labelsText}

Données structurées
\`\`\`json
${JSON.stringify(structured, null, 2)}
\`\`\``;
}
