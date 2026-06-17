import type { AnalysisResult, TerritoryAnalysis, TerritoryProfile } from "./types";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un analyste territorial spécialisé dans les communes françaises.

Règles impératives :
- Tu ne dois JAMAIS inventer de chiffres, statistiques ou faits non fournis dans les données.
- Tu dois distinguer clairement les faits (présents dans les données), les hypothèses et les limites.
- Si une information manque, indique-le explicitement dans dataLimits.
- Base ton analyse uniquement sur les données territoriales fournies.
- Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour.

Structure JSON attendue :
{
  "summary": "résumé court du territoire en 2-3 phrases",
  "strengths": ["point fort 1", "point fort 2"],
  "watchPoints": ["point d'attention 1"],
  "opportunities": ["opportunité possible 1"],
  "dataLimits": ["limite des données 1"]
}`;

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
    entreprises: territory.enrichment?.enterprises
      ? {
          unitesLegalesAvecEtablissement:
            territory.enrichment.enterprises.legalUnitsWithEstablishment,
          secteursDominants:
            territory.enrichment.enterprises.topActivitySections,
          essEchantillon: territory.enrichment.enterprises.essCount,
          rgeEchantillon: territory.enrichment.enterprises.rgeCount,
          tranchesEffectif: territory.enrichment.enterprises.staffSizeBands,
          note: territory.enrichment.enterprises.note,
        }
      : null,
    equipements: territory.enrichment?.equipments?.available
      ? {
          annee: territory.enrichment.equipments.year,
          total: territory.enrichment.equipments.totalEquipments,
          parDomaine: territory.enrichment.equipments.byDomain,
          parType: territory.enrichment.equipments.byType,
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
          prixM2: territory.enrichment.property.medianPricePerM2,
          prixMoyen: territory.enrichment.property.averagePrice,
          mutations: territory.enrichment.property.mutationCount,
          note: territory.enrichment.property.note,
        }
      : null,
    sources: territory.sources.map((source) => source.name),
  };

  return `Analyse ce territoire à partir des données suivantes (ne rien inventer) :

${JSON.stringify(facts, null, 2)}`;
}

function parseAnalysisContent(content: string): TerritoryAnalysis {
  const parsed = JSON.parse(content) as Partial<TerritoryAnalysis>;

  return {
    summary: parsed.summary ?? "Analyse non disponible.",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    watchPoints: Array.isArray(parsed.watchPoints) ? parsed.watchPoints : [],
    opportunities: Array.isArray(parsed.opportunities)
      ? parsed.opportunities
      : [],
    dataLimits: Array.isArray(parsed.dataLimits) ? parsed.dataLimits : [],
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
      analysis: null,
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
        analysis: null,
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
        analysis: null,
        configured: true,
        error: "Réponse Mistral vide ou inattendue.",
      };
    }

    return {
      analysis: parseAnalysisContent(content),
      configured: true,
    };
  } catch (error) {
    console.error("Erreur lors de l'appel Mistral:", error);
    return {
      analysis: null,
      configured: true,
      error: "Erreur réseau lors de l'appel à l'API Mistral.",
    };
  }
}
