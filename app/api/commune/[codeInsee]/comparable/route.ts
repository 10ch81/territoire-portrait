import { NextResponse } from "next/server";
import { findComparableCommunes } from "@/lib/compare/comparable";
import { isValidInseeCode } from "@/lib/compare/parse-codes";
import { getEnrichedTerritoryByInsee } from "@/lib/enrichment";

interface RouteParams {
  params: Promise<{ codeInsee: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { codeInsee } = await params;
  const normalized = codeInsee.trim().toUpperCase();

  if (!isValidInseeCode(normalized)) {
    return NextResponse.json(
      { error: "Code INSEE invalide." },
      { status: 400 },
    );
  }

  const territory = await getEnrichedTerritoryByInsee(normalized);
  if (!territory) {
    return NextResponse.json(
      { error: "Commune introuvable." },
      { status: 404 },
    );
  }

  const result = await findComparableCommunes(territory);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
