import Link from "next/link";
import { notFound } from "next/navigation";
import { AiAnalysisClient } from "@/components/AiAnalysisClient";
import { PortraitNarratifClient } from "@/components/PortraitNarratifClient";
import { AnalysisReadyProvider } from "@/components/AnalysisReadyProvider";
import { ComparableCommunesPanel } from "@/components/commune/ComparableCommunesPanel";
import {
  CommuneViewToggle,
  type CommuneViewMode,
} from "@/components/commune/CommuneViewToggle";
import { PortraitBlocks } from "@/components/commune/PortraitBlocks";
import { CompletenessIndicator } from "@/components/CompletenessIndicator";
import { EnrichmentIntro } from "@/components/DataSection";
import { EnrichmentSections } from "@/components/enrichment/EnrichmentSections";
import { KpiHero } from "@/components/KpiHero";
import { RecentCommuneTracker } from "@/components/RecentCommuneTracker";
import { SectionNav } from "@/components/SectionNav";
import { ShareActions } from "@/components/ShareActions";
import { SourcesList } from "@/components/SourcesList";
import { getEnrichedTerritoryByInsee } from "@/lib/enrichment";
import {
  buildCommunePortrait,
  findComparableCommunes,
} from "@/lib/compare";
import { attachDepartmentRanksToPortrait } from "@/lib/indicators/department-ranks";
import { isPortraitNarrativeAvailable } from "@/lib/portrait/generate-portrait";
import { computeCompleteness } from "@/lib/ux/completeness";
import { extractHeroKpis } from "@/lib/ux/kpis";
import { getVisibleSections } from "@/lib/ux/sections";

interface CommunePageProps {
  params: Promise<{ codeInsee: string }>;
  searchParams: Promise<{ vue?: string }>;
}

function resolveCommuneView(vue: string | undefined): CommuneViewMode {
  return vue === "detail" ? "detail" : "particulier";
}

export default async function CommunePage({ params, searchParams }: CommunePageProps) {
  const { codeInsee } = await params;
  const { vue: vueParam } = await searchParams;
  const vue = resolveCommuneView(vueParam);

  const territory = await getEnrichedTerritoryByInsee(codeInsee);

  if (!territory) {
    notFound();
  }

  const kpis = extractHeroKpis(territory);
  const completeness = computeCompleteness(territory);
  const sections = getVisibleSections(territory);
  const portraitNarrativeAvailable = isPortraitNarrativeAvailable();
  const portrait =
    vue === "particulier"
      ? attachDepartmentRanksToPortrait(buildCommunePortrait(territory), territory.inseeCode)
      : null;
  const comparable =
    vue === "particulier" ? await findComparableCommunes(territory) : null;

  return (
    <AnalysisReadyProvider key={territory.inseeCode}>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 print:max-w-none print:py-4">
        <RecentCommuneTracker
          inseeCode={territory.inseeCode}
          name={territory.name}
          departmentCode={territory.department?.code}
        />

        <header className="space-y-3 print:space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex text-sm text-blue-700 hover:underline print:hidden"
            >
              ← Nouvelle recherche
            </Link>
            <ShareActions communeName={territory.name} />
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {territory.name}
              </h1>
              <p className="text-sm text-slate-500">
                Portrait territorial · INSEE {territory.inseeCode}
                {territory.department
                  ? ` · ${territory.department.name} (${territory.department.code})`
                  : ""}
              </p>
            </div>
            <CompletenessIndicator completeness={completeness} />
          </div>
          <CommuneViewToggle vue={vue} inseeCode={territory.inseeCode} />
        </header>

        <KpiHero kpis={kpis} />

        {vue === "particulier" && portrait && comparable ? (
          <div className="space-y-6 print:hidden">
            <PortraitBlocks portrait={portrait} />
            <ComparableCommunesPanel
              currentInseeCode={territory.inseeCode}
              currentName={territory.name}
              comparable={comparable}
            />
            <AiAnalysisClient codeInsee={territory.inseeCode} />
          </div>
        ) : (
          <>
            <SectionNav sections={sections} />
            <AiAnalysisClient codeInsee={territory.inseeCode} />
            {portraitNarrativeAvailable ? (
              <PortraitNarratifClient codeInsee={territory.inseeCode} />
            ) : null}
            <div className="space-y-4">
              <EnrichmentIntro />
              <EnrichmentSections territory={territory} />
            </div>
          </>
        )}

        <div id="sources">
          <SourcesList sources={territory.sources} />
        </div>
      </main>
    </AnalysisReadyProvider>
  );
}
