import { NextResponse } from "next/server";
import { buildCommunePortrait } from "@/lib/compare/single-portrait";
import { isValidInseeCode } from "@/lib/compare/parse-codes";
import { getEnrichedTerritoryByInsee } from "@/lib/enrichment";
import { attachDepartmentRanksToPortrait } from "@/lib/indicators/department-ranks";
import { buildCommuneJsonLd } from "@/lib/semantic/jsonld-commune";

interface RouteParams {
  params: Promise<{ codeInsee: string }>;
}

function resolveBaseUrl(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

export async function GET(request: Request, { params }: RouteParams) {
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

  const { searchParams } = new URL(request.url);
  const includeSensitive = searchParams.get("includeSensitive") === "1";

  const portrait = attachDepartmentRanksToPortrait(
    buildCommunePortrait(territory),
    normalized,
  );

  const document = buildCommuneJsonLd({
    territory,
    portrait,
    baseUrl: resolveBaseUrl(request),
    options: { includeSensitive },
  });

  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/ld+json; charset=utf-8",
    },
  });
}
