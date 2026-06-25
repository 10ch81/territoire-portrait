import { NextResponse } from "next/server";
import { buildPublicIndicatorCatalog } from "@/lib/indicators/catalog";

export async function GET() {
  const catalog = buildPublicIndicatorCatalog();

  return NextResponse.json(
    {
      version: 1,
      count: catalog.length,
      indicators: catalog,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
