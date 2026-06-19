import { isAavCommuneCentre } from "./labels";
import type {
  AttractionAreaTypologySnapshot,
  ComparisonProfile,
  DensityGridSnapshot,
  PublicPolicyTypologiesSnapshot,
  UrbanUnitTypologySnapshot,
} from "./types";

function densityPhrase(snapshot: DensityGridSnapshot | undefined): string | null {
  return snapshot?.simplifiedLabel ?? null;
}

function aavPhrase(snapshot: AttractionAreaTypologySnapshot | undefined): string | null {
  if (!snapshot?.available) return null;

  switch (snapshot.role) {
    case "pole":
      if (isAavCommuneCentre(snapshot.categoryCode)) {
        return "ville-centre d'aire d'attraction";
      }
      return "commune de centralité dans une aire d'attraction";
    case "couronne":
      return "commune de couronne périurbaine";
    case "hors_attraction":
      return "commune hors attraction des villes";
    default:
      return null;
  }
}

function profileFallback(profile: ComparisonProfile): string | null {
  switch (profile) {
    case "metropole":
      return "commune dense de grande agglomération";
    case "grande_ville":
      return "commune dense de centralité urbaine";
    case "ville_moyenne":
      return "ville moyenne de centralité";
    case "petite_centralite":
      return "petite centralité";
    case "periurbain":
      return "commune périurbaine";
    case "rural":
      return "commune rurale";
    case "rural_isole":
      return "commune rurale peu dense";
    default:
      return null;
  }
}

export function buildSummaryLabel(input: {
  comparisonProfile: ComparisonProfile;
  densityGrid?: DensityGridSnapshot;
  attractionArea?: AttractionAreaTypologySnapshot;
  urbanUnit?: UrbanUnitTypologySnapshot;
  publicPolicyTypologies?: PublicPolicyTypologiesSnapshot;
}): string | undefined {
  const density = densityPhrase(input.densityGrid);
  const aav = aavPhrase(input.attractionArea);
  const profile = input.comparisonProfile;

  if (profile === "metropole" || profile === "grande_ville") {
    if (density?.includes("dense")) {
      return profile === "metropole"
        ? "commune dense de grande agglomération"
        : "commune dense de centralité urbaine";
    }
    return profileFallback(profile) ?? undefined;
  }

  if (aav) {
    if (aav.includes("couronne")) {
      return "commune de couronne périurbaine";
    }
    if (aav.includes("hors attraction")) {
      return density?.includes("peu dense")
        ? "commune rurale peu dense"
        : "commune hors attraction des villes";
    }
    if (aav.includes("ville-centre")) {
      return profile === "petite_centralite"
        ? "petite centralité rurale"
        : "ville moyenne de centralité";
    }
  }

  if (density) {
    if (density.includes("peu dense") || density.includes("très peu dense")) {
      return profile === "rural_isole" ? "commune rurale peu dense" : density;
    }
    if (density.includes("intermédiaire")) {
      return profile === "petite_centralite" ? "petite centralité" : density;
    }
    return density;
  }

  return profileFallback(profile) ?? undefined;
}
