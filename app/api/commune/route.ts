import { NextResponse } from "next/server";
import { resolveCommuneAndAddressSearch } from "@/lib/geo/resolve-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json(
      { error: "Paramètre de recherche « q » requis." },
      { status: 400 },
    );
  }

  try {
    const result = await resolveCommuneAndAddressSearch(query);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur API commune:", error);
    return NextResponse.json(
      {
        error:
          "Impossible de résoudre la commune pour le moment. Réessayez plus tard.",
      },
      { status: 502 },
    );
  }
}
