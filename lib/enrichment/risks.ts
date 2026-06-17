import { createGeorisquesSource } from "../sources";
import type { CatNatEvent, FloodRisk, RadonRisk, RisksSnapshot } from "../types";

interface GeorisquesRadonResponse {
  data?: Array<{
    classe_potentiel?: string;
  }>;
}

interface GeorisquesAziResponse {
  data?: Array<{
    libelle_azi?: string;
    liste_libelle_risque?: Array<{ libelle_risque_long?: string }>;
  }>;
}

interface GeorisquesCatNatResponse {
  data?: Array<{
    libelle_risque_jo?: string;
    date_debut_evt?: string;
  }>;
}

const RADON_LABELS: Record<string, string> = {
  "1": "Potentiel radon faible",
  "2": "Potentiel radon moyen",
  "3": "Potentiel radon élevé",
};

async function fetchGeorisques<T>(path: string): Promise<T | null> {
  const response = await fetch(`https://georisques.gouv.fr/api/v1/${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    console.error("Erreur Géorisques:", response.status, path);
    return null;
  }

  return (await response.json()) as T;
}

export async function fetchRisksSnapshot(inseeCode: string): Promise<RisksSnapshot> {
  const [radonData, aziData, catNatData] = await Promise.all([
    fetchGeorisques<GeorisquesRadonResponse>(`radon?code_insee=${inseeCode}`),
    fetchGeorisques<GeorisquesAziResponse>(`gaspar/azi?code_insee=${inseeCode}`),
    fetchGeorisques<GeorisquesCatNatResponse>(
      `gaspar/catnat?code_insee=${inseeCode}`,
    ),
  ]);

  const radonEntry = radonData?.data?.[0];
  const radon: RadonRisk | null = radonEntry?.classe_potentiel
    ? {
        potentialClass: radonEntry.classe_potentiel,
        label:
          RADON_LABELS[radonEntry.classe_potentiel] ??
          `Classe radon ${radonEntry.classe_potentiel}`,
      }
    : null;

  const floodZones = (aziData?.data ?? []).flatMap((entry) => {
    const zoneName = entry.libelle_azi;
    const risks =
      entry.liste_libelle_risque
        ?.map((risk) => risk.libelle_risque_long)
        .filter(Boolean) ?? [];

    if (zoneName && risks.length > 0) {
      return risks.map((risk) => `${zoneName} — ${risk}`);
    }

    return zoneName ? [zoneName] : [];
  });

  const flood: FloodRisk | null =
    floodZones.length > 0
      ? {
          zones: floodZones.slice(0, 5),
          count: floodZones.length,
        }
      : null;

  const catNatEvents: CatNatEvent[] = (catNatData?.data ?? [])
    .slice(0, 5)
    .map((event) => ({
      label: event.libelle_risque_jo ?? "Événement CATNAT",
      startDate: event.date_debut_evt ?? null,
    }));

  const available = Boolean(radon || flood || catNatEvents.length > 0);

  return {
    radon,
    flood,
    catNatEvents,
    available,
    note: "Radon, atlas des zones inondables (AZI) et CATNAT via l'API Géorisques.",
  };
}

export { createGeorisquesSource };
