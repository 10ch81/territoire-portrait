import { getEnrichedTerritoryByInsee } from "@/lib/enrichment";
import {
  buildTerritoryComparison,
  MIN_COMPARE_COMMUNES,
  parseCompareCodesParam,
} from "@/lib/compare";
import { ComparePageContent } from "@/components/compare/ComparePageContent";

interface ComparePageProps {
  searchParams: Promise<{ codes?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const selectedCodes = parseCompareCodesParam(params.codes);

  const resolved = await Promise.all(
    selectedCodes.map(async (code) => ({
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

  const selectedNames = Object.fromEntries(
    territories.map((territory) => [territory.inseeCode, territory.name]),
  );

  const comparison =
    territories.length >= MIN_COMPARE_COMMUNES
      ? buildTerritoryComparison(territories)
      : null;

  return (
    <ComparePageContent
      selectedCodes={selectedCodes.filter((code) => !notFoundCodes.includes(code))}
      selectedNames={selectedNames}
      comparison={comparison}
      notFoundCodes={notFoundCodes}
    />
  );
}
