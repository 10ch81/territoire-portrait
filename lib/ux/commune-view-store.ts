"use client";

import {
  COMMUNE_VIEW_STORAGE_KEY,
  type CommuneViewMode,
  isCommuneViewMode,
  parseCommuneViewParam,
} from "./commune-view";

export function readStoredCommuneView(): CommuneViewMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(COMMUNE_VIEW_STORAGE_KEY);
  if (!raw || !isCommuneViewMode(raw)) {
    return null;
  }
  return raw;
}

export function saveCommuneView(mode: CommuneViewMode): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(COMMUNE_VIEW_STORAGE_KEY, mode);
}

/** Applique la préférence stockée si l'URL n'a pas de param `vue`. */
export function resolveCommuneViewFromUrl(
  vueParam: string | undefined,
): CommuneViewMode {
  if (vueParam !== undefined && vueParam !== "") {
    return parseCommuneViewParam(vueParam);
  }
  return readStoredCommuneView() ?? "synthese";
}
