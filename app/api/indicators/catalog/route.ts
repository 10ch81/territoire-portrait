import { NextResponse } from "next/server";
import { buildPublicIndicatorCatalog } from "@/lib/indicators/catalog";
import { filterCatalogByAudience, parseAudienceParam } from "@/lib/indicators/audience-tags";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const audience = parseAudienceParam(searchParams.get("audience"));
  const catalog = filterCatalogByAudience(buildPublicIndicatorCatalog(), audience);

  return NextResponse.json(
    {
      version: 1,
      count: catalog.length,
      audience: audience ?? "all",
      indicators: catalog,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
