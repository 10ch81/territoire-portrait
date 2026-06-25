import { NextResponse } from "next/server";
import {
  buildTerritoryComparison,
  buildCompareUrl,
  MIN_COMPARE_COMMUNES,
  parseCompareCodesParam,
  parseComparePrioritiesParam,
} from "@/lib/compare";
import { getEnrichedTerritoryByInsee } from "@/lib/enrichment";
import { attachDepartmentRanksToComparison } from "@/lib/indicators/department-ranks";
import { buildCompareJsonLd } from "@/lib/semantic/jsonld-compare";

function resolveBaseUrl(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const codes = parseCompareCodesParam(searchParams.get("codes") ?? undefined);
  const priorityIds = parseComparePrioritiesParam(searchParams.get("priorites") ?? undefined);
  const includeSensitive = searchParams.get("includeSensitive") === "1";

  if (codes.length < MIN_COMPARE_COMMUNES) {
    return NextResponse.json(
      {
        error: `Au moins ${MIN_COMPARE_COMMUNES} codes INSEE valides requis (paramètre codes).`,
      },
      { status: 400 },
    );
  }

  const resolved = await Promise.all(
    codes.map(async (code) => ({
      code,
      territory: await getEnrichedTerritoryByInsee(code),
    })),
  );

  const territories = resolved
    .filter((item): item is { code: string; territory: NonNullable<typeof item.territory> } =>
      item.territory !== null,
    )
    .map((item) => item.territory);

  const notFoundCodes = resolved
    .filter((item) => item.territory === null)
    .map((item) => item.code);

  if (territories.length < MIN_COMPARE_COMMUNES) {
    return NextResponse.json(
      {
        error: "Communes introuvables ou insuffisantes pour la comparaison.",
        notFoundCodes,
      },
      { status: 404 },
    );
  }

  const comparison = attachDepartmentRanksToComparison(
    buildTerritoryComparison(territories),
  );

  const resolvedCodes = territories.map((territory) => territory.inseeCode);
  const compareUrl = buildCompareUrl(resolvedCodes, { priorities: priorityIds });
  const baseUrl = resolveBaseUrl(request);

  const document = buildCompareJsonLd({
    territories,
    comparison,
    baseUrl,
    compareUrl,
    options: { includeSensitive, priorityIds },
  });

  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/ld+json; charset=utf-8",
    },
  });
}
