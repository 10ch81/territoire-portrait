export type CommuneViewMode = "synthese" | "analyse" | "sources";

export const COMMUNE_VIEW_STORAGE_KEY = "territoire-portrait:commune-vue";

const VALID_MODES = new Set<CommuneViewMode>(["synthese", "analyse", "sources"]);

/** Résout le param URL `vue` avec rétrocompat `particulier` / `detail`. */
export function parseCommuneViewParam(raw: string | undefined): CommuneViewMode {
  if (raw === "detail" || raw === "analyse") {
    return "analyse";
  }
  if (raw === "sources") {
    return "sources";
  }
  if (raw === "particulier" || raw === "synthese" || raw === undefined || raw === "") {
    return "synthese";
  }
  return "synthese";
}

/** Param URL canonique — `synthese` = pas de query. */
export function serializeCommuneViewParam(mode: CommuneViewMode): string | null {
  if (mode === "synthese") {
    return null;
  }
  return mode;
}

export function isCommuneViewMode(value: string): value is CommuneViewMode {
  return VALID_MODES.has(value as CommuneViewMode);
}

export function communeViewLabel(mode: CommuneViewMode): string {
  switch (mode) {
    case "synthese":
      return "Synthèse";
    case "analyse":
      return "Analyse";
    case "sources":
      return "Sources";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
