import { loadJsonCache } from "../lib/enrichment/cache";
import { buildTerritoryTypology } from "../lib/typology/build-territory-typology";
import { loadGeographySnapshot } from "../lib/enrichment/geography";
import { getTerritoryByInsee } from "../lib/territory";

const SAMPLE_CODES = ["44109", "35238", "09225", "75056", "99099"];

async function main(): Promise<void> {
  const cache = loadJsonCache<Record<string, unknown>>("typology-by-commune.json");
  console.log(`Cache typologie : ${cache ? Object.keys(cache).length : 0} communes`);

  for (const code of SAMPLE_CODES) {
    const territory = await getTerritoryByInsee(code);
    if (!territory) {
      console.log(`\n${code} — commune introuvable`);
      continue;
    }

    const geography = await loadGeographySnapshot(territory);
    const typology = buildTerritoryTypology({
      territory: {
        ...territory,
        enrichment: {
          populationHistory: null,
          sociodemographics: null,
          enterprises: null,
          employmentSectors: null,
          equipments: null,
          education: null,
          health: null,
          risks: null,
          security: null,
          housing: null,
          mobility: null,
          urbanPolicy: null,
          fiscal: null,
          publicAccounts: null,
          proximityServices: null,
          tourism: null,
          property: null,
          derived: null,
          geography,
          territoryTypology: null,
          sources: [],
        },
      },
      geographyAav: geography.attractionArea,
    });

    console.log(`\n${territory.name} (${code})`);
    console.log(`  summaryLabel: ${typology.summaryLabel ?? "—"}`);
    console.log(`  comparisonProfile: ${typology.comparisonProfile}`);
    console.log(`  families: ${typology.availableFamilies.join(", ") || "—"}`);
    if (typology.missingFamilies.length > 0) {
      console.log(`  missing: ${typology.missingFamilies.join(", ")}`);
    }
  }
}

main().catch(console.error);
