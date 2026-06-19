"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  EXAMPLE_COMMUNES,
  loadRecentCommunes,
  type RecentCommune,
} from "@/lib/ux/recent-communes";

function subscribeRecentCommunes(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getRecentCommunesSnapshot(): RecentCommune[] {
  return loadRecentCommunes();
}

function getRecentCommunesServerSnapshot(): RecentCommune[] {
  return [];
}

export function SearchSuggestions() {
  const recent = useSyncExternalStore(
    subscribeRecentCommunes,
    getRecentCommunesSnapshot,
    getRecentCommunesServerSnapshot,
  );

  if (recent.length === 0) {
    return (
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-slate-500">Exemples :</span>
        {EXAMPLE_COMMUNES.map((example) => (
          <Link
            key={example.inseeCode}
            href={`/commune/${example.inseeCode}`}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            {example.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Récentes :</span>
        {recent.map((commune) => (
          <Link
            key={commune.inseeCode}
            href={`/commune/${commune.inseeCode}`}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            {commune.name}
            {commune.departmentCode ? ` (${commune.departmentCode})` : ""}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Exemples :</span>
        {EXAMPLE_COMMUNES.map((example) => (
          <Link
            key={example.inseeCode}
            href={`/commune/${example.inseeCode}`}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
          >
            {example.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
