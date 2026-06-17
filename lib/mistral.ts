import { computeDataLimits } from "./data-limits";
import type { AnalysisResult, TerritoryAnalysis, TerritoryProfile } from "./types";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un analyste territorial spécialisé dans les communes françaises.

Règles impératives :
- Tu ne dois JAMAIS inventer de chiffres, statistiques ou faits non fournis dans les données.
- Tu dois distinguer clairement les faits (présents dans les données), les hypothèses et les limites.
- Base ton analyse uniquement sur les données territoriales fournies.
- Les limites des sources sont calculées côté serveur : concentre-toi sur summary, strengths, watchPoints et opportunities.
- Ne déclare JAMAIS qu'une donnée est absente si elle est présente dans le JSON (ex. tauxChomage1564 non null, equipements.total > 0, mutationsMaisons/mutationsAppartements renseignés).
- Les comptages ESS et RGE (SIRENE) proviennent de filtres API dédiés ; ne pas extrapoler la structure sectorielle ni les effectifs salariés.
- Les données RPLS (loués / vacants) décrivent le parc locatif social, pas le marché immobilier général.
- La BPE dénombre des équipements (y compris enseignement et services publics de proximité) : ne pas écrire qu'il n'y a pas d'écoles ou de mairie si des comptages sont fournis.
- Si tauxChomage1564 est renseigné, tu peux l'utiliser ; ne pas conclure à une absence de données sur l'emploi local pour ce seul indicateur.
- Si un prix immobilier est null mais qu'un volume de mutations est fourni, mentionner le volume sans estimer de prix.
- Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour.

Structure JSON attendue :
{
  "summary": "résumé court du territoire en 2-3 phrases",
  "strengths": ["point fort 1", "point fort 2"],
  "watchPoints": ["point d'attention 1"],
  "opportunities": ["opportunité possible 1"]
}`;

function emptyAnalysis(territory: TerritoryProfile): TerritoryAnalysis {
  return {
    summary: "",
    strengths: [],
    watchPoints: [],
    opportunities: [],
    dataLimits: computeDataLimits(territory),
  };
}

function getMistralConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model: process.env.MISTRAL_MODEL?.trim() || "mistral-large-latest",
  };
}

function buildUserPrompt(territory: TerritoryProfile): string {
  const facts = {
    nom: territory.name,
    codeInsee: territory.inseeCode,
    codesPostaux: territory.postalCodes,
    departement: territory.department,
    region: territory.region,
    epci: territory.epci,
    population: territory.population,
    densiteHabKm2: territory.densityPerKm2,
    coordonnees: territory.coordinates,
    surfaceKm2: territory.surfaceKm2,
    evolutionDemographique: territory.enrichment?.populationHistory?.available
      ? territory.enrichment.populationHistory.history
      : null,
    structureParAge: territory.enrichment?.sociodemographics?.available
      ? {
          tranches: territory.enrichment.sociodemographics.ageBands,
          tauxChomage1564: territory.enrichment.sociodemographics.unemploymentRate,
          revenuMedianDisponible:
            territory.enrichment.sociodemographics.medianDisposableIncome,
          note: territory.enrichment.sociodemographics.note,
        }
      : null,
    entreprises: territory.enrichment?.enterprises
      ? {
          unitesLegalesAvecEtablissement:
            territory.enrichment.enterprises.legalUnitsWithEstablishment,
          totalPlafonneApi: territory.enrichment.enterprises.legalUnitsIsCapped,
          ess: territory.enrichment.enterprises.essCount,
          rge: territory.enrichment.enterprises.rgeCount,
          note: territory.enrichment.enterprises.note,
        }
      : null,
    equipements: territory.enrichment?.equipments?.available
      ? {
          annee: territory.enrichment.equipments.year,
          total: territory.enrichment.equipments.totalEquipments,
          parDomaine: territory.enrichment.equipments.byDomain,
          parType: territory.enrichment.equipments.byType,
          transports: territory.enrichment.equipments.transport,
          note: territory.enrichment.equipments.note,
        }
      : null,
    risques: territory.enrichment?.risks?.available
      ? {
          radon: territory.enrichment.risks.radon,
          inondation: territory.enrichment.risks.flood,
          catnat: territory.enrichment.risks.catNatEvents,
          note: territory.enrichment.risks.note,
        }
      : null,
    logementsSociaux: territory.enrichment?.housing?.available
      ? {
          annee: territory.enrichment.housing.year,
          parcTotal: territory.enrichment.housing.totalUnits,
          loues: territory.enrichment.housing.occupiedUnits,
          vacants: territory.enrichment.housing.vacantUnits,
          parcLogementsGlobal: territory.enrichment.housing.totalDwellings,
          partDuParcGlobal: territory.enrichment.housing.socialHousingSharePercent,
          tauxVacance: territory.enrichment.housing.vacancyRatePercent,
          note: territory.enrichment.housing.note,
        }
      : null,
    irve: territory.enrichment?.mobility?.available
      ? {
          pointsDeCharge: territory.enrichment.mobility.chargingPoints,
          stations: territory.enrichment.mobility.stations,
          note: territory.enrichment.mobility.note,
        }
      : null,
    fiscalite: territory.enrichment?.fiscal?.available
      ? {
          annee: territory.enrichment.fiscal.year,
          tauxTfb: territory.enrichment.fiscal.propertyTaxBuiltRate,
          tauxTfnb: territory.enrichment.fiscal.propertyTaxUnbuiltRate,
          note: territory.enrichment.fiscal.note,
        }
      : null,
    geographie: {
      aireAttraction: territory.enrichment?.geography?.attractionArea?.available
        ? territory.enrichment.geography.attractionArea
        : null,
      comparatifEpci: territory.enrichment?.geography?.epciComparison?.available
        ? territory.enrichment.geography.epciComparison
        : null,
    },
    immobilier: territory.enrichment?.property?.available
      ? {
          annee: territory.enrichment.property.year,
          prixM2Moyen: territory.enrichment.property.averagePricePerM2,
          prixMoyenMutation: territory.enrichment.property.averageTransactionPrice,
          mutations: territory.enrichment.property.mutationCount,
          mutationsMaisons: territory.enrichment.property.houseMutations,
          mutationsAppartements: territory.enrichment.property.apartmentMutations,
          serieHistorique: territory.enrichment.property.priceHistory,
          prixM2MoyenDepartement:
            territory.enrichment.property.departmentAveragePricePerM2,
          note: territory.enrichment.property.note,
        }
      : null,
    indicateursDerives: territory.enrichment?.derived?.available
      ? territory.enrichment.derived
      : null,
    sources: territory.sources.map((source) => source.name),
  };

  return `Analyse ce territoire à partir des données suivantes (ne rien inventer) :

${JSON.stringify(facts, null, 2)}`;
}

function parseAnalysisContent(
  content: string,
  territory: TerritoryProfile,
): TerritoryAnalysis {
  const parsed = JSON.parse(content) as Partial<TerritoryAnalysis>;

  return {
    summary: parsed.summary ?? "Analyse non disponible.",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    watchPoints: Array.isArray(parsed.watchPoints) ? parsed.watchPoints : [],
    opportunities: Array.isArray(parsed.opportunities)
      ? parsed.opportunities
      : [],
    dataLimits: computeDataLimits(territory),
  };
}

export function isMistralConfigured(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY?.trim());
}

function getMissingApiKeyMessage(): string {
  if (process.env.VERCEL) {
    return (
      "L'analyse IA n'est pas configurée sur ce déploiement Vercel. " +
      "Vérifiez que MISTRAL_API_KEY est définie pour l'environnement Production " +
      "(ou Preview), puis redéployez le projet."
    );
  }

  return (
    "L'analyse IA n'est pas configurée en local. " +
    "Ajoutez MISTRAL_API_KEY dans .env.local, ou exécutez « npx vercel env pull .env.local » " +
    "après avoir ajouté la clé à l'environnement Development sur Vercel."
  );
}

export async function analyzeTerritory(
  territory: TerritoryProfile,
): Promise<AnalysisResult> {
  const config = getMistralConfig();

  if (!config) {
    return {
      analysis: emptyAnalysis(territory),
      configured: false,
      error: getMissingApiKeyMessage(),
    };
  }

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(territory) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Erreur Mistral:", response.status, errorBody);
      return {
        analysis: emptyAnalysis(territory),
        configured: true,
        error: `L'analyse IA a échoué (statut ${response.status}). Vérifiez la clé API et le modèle.`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        analysis: emptyAnalysis(territory),
        configured: true,
        error: "Réponse Mistral vide ou inattendue.",
      };
    }

    return {
      analysis: parseAnalysisContent(content, territory),
      configured: true,
    };
  } catch (error) {
    console.error("Erreur lors de l'appel Mistral:", error);
    return {
      analysis: emptyAnalysis(territory),
      configured: true,
      error: "Erreur réseau lors de l'appel à l'API Mistral.",
    };
  }
}
