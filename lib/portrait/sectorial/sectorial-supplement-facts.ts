import { binding, createFact } from "@/lib/analysis/builders/utils";
import { formatPercent } from "@/lib/analysis/format";
import { isRpUnemploymentDocumented } from "@/lib/analysis/qualify-facts";
import {
  qualifiesAsProfileAwareLovacWatchPoint,
  resolveComparisonProfile,
} from "@/lib/typology/thresholds";
import type { AnalysisFact } from "@/lib/analysis/types";
import type { TerritoryProfile } from "@/lib/types";

function buildSectorialLabourMarketFacts(territory: TerritoryProfile): AnalysisFact[] {
  const labourMarket = territory.enrichment?.labourMarket;

  if (!labourMarket?.available || labourMarket.totalJobSeekers == null) {
    return [];
  }

  if (!isRpUnemploymentDocumented(territory)) {
    return [];
  }

  return [
    createFact({
      theme: "employment",
      target: "summary",
      sentence: `${labourMarket.totalJobSeekers.toLocaleString("fr-FR")} inscrits à France Travail en moyenne sur le trimestre ${labourMarket.quarter ?? ""} (catégorie ABC).`,
      sourceKeys: ["france-travail-defm"],
      year: labourMarket.quarter
        ? Number.parseInt(labourMarket.quarter.split("-")[0] ?? "", 10)
        : undefined,
      confidence: "medium",
      limitations: [
        labourMarket.note,
        "Inscrits France Travail ABC — registre distinct du taux de chômage RP.",
      ],
      numericBindings: [
        binding(
          labourMarket.totalJobSeekers,
          "inscrits France Travail ABC",
          "employment",
          ["France Travail", "inscrits", "demandeurs d'emploi", "ABC"],
        ),
      ],
    }),
  ];
}

function buildSectorialIpsFacts(territory: TerritoryProfile): AnalysisFact[] {
  const education = territory.enrichment?.education;

  if (!education || education.averageIps == null) {
    return [];
  }

  const ipsRange =
    education.ipsMin != null && education.ipsMax != null
      ? `, avec des écarts de ${education.ipsMin.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} à ${education.ipsMax.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} selon les écoles`
      : "";

  return [
    createFact({
      theme: "education",
      target: "summary",
      sentence: `L'indice de position sociale (IPS) moyen des écoles s'élève à ${education.averageIps.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${ipsRange} (année scolaire ${education.ipsSchoolYear ?? education.year}).`,
      sourceKeys: ["depp-ips-ecoles"],
      year: education.ipsSchoolYear ?? education.year,
      confidence: "high",
      limitations: [
        "IPS mesure la composition sociale des écoles ; ne pas généraliser à toute la commune.",
      ],
      numericBindings: [
        binding(education.averageIps, "IPS moyen", "education", ["IPS", "position sociale"]),
        ...(education.ipsMin != null
          ? [binding(education.ipsMin, "IPS minimum", "education", ["IPS", "minimum"])]
          : []),
        ...(education.ipsMax != null
          ? [binding(education.ipsMax, "IPS maximum", "education", ["IPS", "maximum"])]
          : []),
      ],
    }),
  ];
}

function buildSectorialLovacFacts(territory: TerritoryProfile): AnalysisFact[] {
  const housing = territory.enrichment?.housing;

  if (
    !housing?.available ||
    housing.privateVacancyRatePercent == null ||
    housing.lovacVintage == null
  ) {
    return [];
  }

  if (
    qualifiesAsProfileAwareLovacWatchPoint(
      housing.privateVacancyRatePercent,
      resolveComparisonProfile(territory),
    )
  ) {
    return [];
  }

  return [
    createFact({
      theme: "housing",
      target: "summary",
      sentence: `Le parc privé compte ${formatPercent(housing.privateVacancyRatePercent)} de logements vacants au 1er janvier ${housing.lovacVintage} (LOVAC).`,
      sourceKeys: ["cerema-lovac"],
      year: housing.lovacVintage,
      confidence: "medium",
      limitations: [
        "Parc privé vacant (sources fiscales) — distinct de la vacance générale RP.",
        housing.lovacNote ?? "Surestimation possible vs recensement.",
      ],
      numericBindings: [
        binding(
          housing.privateVacancyRatePercent,
          "taux vacance parc privé LOVAC",
          "housing",
          ["LOVAC", "parc privé", "vacance", "logements vacants"],
        ),
      ],
    }),
  ];
}

export function buildSectorialSupplementFacts(territory: TerritoryProfile): AnalysisFact[] {
  return [
    ...buildSectorialLabourMarketFacts(territory),
    ...buildSectorialIpsFacts(territory),
    ...buildSectorialLovacFacts(territory),
  ];
}
