"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export type CommuneViewMode = "particulier" | "detail";

interface CommuneViewToggleProps {
  vue: CommuneViewMode;
  inseeCode: string;
}

export function CommuneViewToggle({ vue, inseeCode }: CommuneViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();

  function setVue(next: CommuneViewMode) {
    const params = new URLSearchParams();
    if (next === "detail") {
      params.set("vue", "detail");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <span className="text-sm text-slate-500">Affichage :</span>
      <button
        type="button"
        onClick={() => setVue("particulier")}
        aria-pressed={vue === "particulier"}
        className={`rounded-full px-3 py-1 text-sm font-medium transition ${
          vue === "particulier"
            ? "bg-blue-700 text-white"
            : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300"
        }`}
      >
        Synthèse
      </button>
      <button
        type="button"
        onClick={() => setVue("detail")}
        aria-pressed={vue === "detail"}
        className={`rounded-full px-3 py-1 text-sm font-medium transition ${
          vue === "detail"
            ? "bg-blue-700 text-white"
            : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300"
        }`}
      >
        Fiche détaillée
      </button>
      <Link
        href={`/compare?codes=${inseeCode}`}
        className="ml-auto text-sm font-medium text-blue-700 hover:underline"
      >
        Ajouter au comparateur →
      </Link>
    </div>
  );
}
