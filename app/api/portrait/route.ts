import { NextResponse } from "next/server";
import { getEnrichedTerritoryByInsee } from "@/lib/enrichment";
import {
  generatePortraitNarrative,
  isPortraitNarrativeAvailable,
} from "@/lib/portrait/generate-portrait";

interface PortraitRequestBody {
  codeInsee?: string;
}

export async function POST(request: Request) {
  if (!isPortraitNarrativeAvailable()) {
    return NextResponse.json(
      { error: "Portrait narratif non configuré." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as PortraitRequestBody;
    const codeInsee = body.codeInsee?.trim();

    if (!codeInsee) {
      return NextResponse.json(
        { error: "Code INSEE requis." },
        { status: 400 },
      );
    }

    const territory = await getEnrichedTerritoryByInsee(codeInsee);

    if (!territory) {
      return NextResponse.json(
        { error: "Territoire introuvable ou code INSEE invalide." },
        { status: 404 },
      );
    }

    const result = await generatePortraitNarrative(territory);

    if (!result.portrait) {
      return NextResponse.json(
        { error: result.error ?? "Impossible de générer le portrait." },
        { status: 500 },
      );
    }

    return NextResponse.json(result.portrait);
  } catch (error) {
    console.error("Erreur API portrait:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du portrait narratif." },
      { status: 500 },
    );
  }
}
