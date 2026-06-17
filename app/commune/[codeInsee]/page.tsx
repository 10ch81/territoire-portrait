import Link from "next/link";
import { notFound } from "next/navigation";
import { AiAnalysis } from "@/components/AiAnalysis";
import { EnrichmentCard } from "@/components/EnrichmentCard";
import { SourcesList } from "@/components/SourcesList";
import { TerritoryCard } from "@/components/TerritoryCard";
import { getEnrichedTerritoryByInsee } from "@/lib/enrichment";
import { analyzeTerritory } from "@/lib/mistral";

interface CommunePageProps {
  params: Promise<{ codeInsee: string }>;
}

export default async function CommunePage({ params }: CommunePageProps) {
  const { codeInsee } = await params;
  const territory = await getEnrichedTerritoryByInsee(codeInsee);

  if (!territory) {
    notFound();
  }

  const analysisResult = await analyzeTerritory(territory);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <Link
          href="/"
          className="inline-flex text-sm text-blue-700 hover:underline"
        >
          ← Nouvelle recherche
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {territory.name}
        </h1>
        <p className="text-sm text-slate-500">
          Portrait territorial · INSEE {territory.inseeCode}
        </p>
      </header>

      <TerritoryCard territory={territory} />
      <EnrichmentCard territory={territory} />
      <AiAnalysis result={analysisResult} />
      <SourcesList sources={territory.sources} />
    </main>
  );
}
