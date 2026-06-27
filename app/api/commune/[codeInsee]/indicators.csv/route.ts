import { NextResponse } from "next/server";
import { buildCommunePortrait } from "@/lib/compare/single-portrait";
import { isValidInseeCode } from "@/lib/compare/parse-codes";
import { getEnrichedTerritoryByInsee } from "@/lib/enrichment";
import { attachDepartmentRanksToPortrait } from "@/lib/indicators/department-ranks";
import { buildCommuneIndicatorsCsv } from "@/lib/indicators/csv-export";

interface RouteParams {
  params: Promise<{ codeInsee: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { codeInsee } = await params;
  const normalized = codeInsee.trim().toUpperCase();

  if (!isValidInseeCode(normalized)) {
    return NextResponse.json({ error: "Code INSEE invalide." }, { status: 400 });
  }

  const territory = await getEnrichedTerritoryByInsee(normalized);
  if (!territory) {
    return NextResponse.json({ error: "Commune introuvable." }, { status: 404 });
  }

  const portrait = attachDepartmentRanksToPortrait(
    buildCommunePortrait(territory),
    normalized,
  );
  const csv = buildCommuneIndicatorsCsv(portrait);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="indicateurs-${normalized}.csv"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
