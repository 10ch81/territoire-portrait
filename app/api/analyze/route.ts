import { NextResponse } from "next/server";
import { analyzeTerritory } from "@/lib/mistral";
import { getTerritoryByInsee } from "@/lib/territory";
import type { TerritoryProfile } from "@/lib/types";

interface AnalyzeRequestBody {
  codeInsee?: string;
  territory?: TerritoryProfile;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;

    let territory = body.territory ?? null;

    if (!territory && body.codeInsee) {
      territory = await getTerritoryByInsee(body.codeInsee);
    }

    if (!territory) {
      return NextResponse.json(
        { error: "Territoire introuvable ou code INSEE invalide." },
        { status: 404 },
      );
    }

    const result = await analyzeTerritory(territory);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur API analyze:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse territoriale." },
      { status: 500 },
    );
  }
}
