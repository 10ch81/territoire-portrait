import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GEO_API_BASE = "https://geo.api.gouv.fr";
const INSEE_CODE_PATTERN = /^(\d{5}|2[AB]\d{3})$/i;

export async function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/commune\/([^/]+)$/);
  if (!match) {
    return NextResponse.next();
  }

  const code = match[1].trim().toUpperCase();
  if (!INSEE_CODE_PATTERN.test(code)) {
    return NextResponse.rewrite(request.nextUrl, { status: 404 });
  }

  try {
    const response = await fetch(
      `${GEO_API_BASE}/communes/${encodeURIComponent(code)}?fields=code&format=json`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (response.status === 404) {
      return NextResponse.rewrite(request.nextUrl, { status: 404 });
    }
  } catch {
    // Fail open: la page serveur gère les erreurs réseau.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/commune/:code*"],
};
