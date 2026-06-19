import type {
  AttractionAreaRole,
  ComparisonProfile,
  PublicPolicyTypologiesSnapshot,
  TerritoryTypology,
  UrbanUnitRole,
} from "@/lib/typology/types";
import { TYPOLOGY_FAMILY_LABELS } from "@/lib/typology/labels";
import type { TypologyFamilyId } from "@/lib/typology/types";

const COMPARISON_PROFILE_LABELS: Record<ComparisonProfile, string> = {
  metropole: "Métropole / grande agglomération",
  grande_ville: "Grande ville",
  ville_moyenne: "Ville moyenne",
  petite_centralite: "Petite centralité",
  periurbain: "Périurbain",
  rural: "Rural",
  rural_isole: "Rural isolé",
  unknown: "Non déterminé",
};

const AAV_ROLE_LABELS: Record<AttractionAreaRole, string> = {
  pole: "Pôle d'attraction",
  couronne: "Couronne périurbaine",
  hors_attraction: "Hors attraction des villes",
  unknown: "Non déterminé",
};

const UU_ROLE_LABELS: Record<UrbanUnitRole, string> = {
  ville_centre: "Ville-centre",
  banlieue: "Banlieue",
  commune_isolee: "Hors unité urbaine",
  unknown: "Non déterminé",
};

export function formatComparisonProfile(profile: ComparisonProfile): string {
  return COMPARISON_PROFILE_LABELS[profile];
}

export function formatAavRole(role: AttractionAreaRole | undefined): string | null {
  if (!role || role === "unknown") return null;
  return AAV_ROLE_LABELS[role];
}

export function formatUrbanUnitRole(role: UrbanUnitRole | undefined): string | null {
  if (!role || role === "unknown") return null;
  return UU_ROLE_LABELS[role];
}

export function listActivePublicPolicies(
  policy: PublicPolicyTypologiesSnapshot | undefined,
): string[] {
  if (!policy?.available) return [];

  const labels: string[] = [];
  if (policy.petitesVillesDeDemain) labels.push("Petites villes de demain");
  if (policy.actionCoeurDeVille) labels.push("Action cœur de ville");
  if (policy.franceRuralitesRevitalisationPlus) {
    labels.push("France Ruralités Revitalisation+");
  } else if (policy.franceRuralitesRevitalisation) {
    labels.push("France Ruralités Revitalisation");
  }
  if (policy.villagesAvenir) labels.push("Villages d'avenir");
  return labels;
}

export function formatTypologyFamilyLabel(family: string): string {
  if (family in TYPOLOGY_FAMILY_LABELS) {
    return TYPOLOGY_FAMILY_LABELS[family as TypologyFamilyId];
  }
  return family;
}

export function hasTypologyContent(typology: TerritoryTypology | null | undefined): boolean {
  if (!typology) return false;
  return typology.availableFamilies.length > 0 || Boolean(typology.summaryLabel);
}

export function typologyContextNote(): string {
  return "Contexte de comparaison et d'interprétation — ne constitue pas un diagnostic territorial.";
}
