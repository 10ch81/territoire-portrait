"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  communeViewLabel,
  serializeCommuneViewParam,
  type CommuneViewMode,
} from "@/lib/ux/commune-view";
import { saveCommuneView } from "@/lib/ux/commune-view-store";

export type { CommuneViewMode };

const VIEW_MODES: CommuneViewMode[] = ["synthese", "analyse", "sources"];

interface CommuneViewToggleProps {
  vue: CommuneViewMode;
  inseeCode: string;
}

export function CommuneViewToggle({ vue, inseeCode }: CommuneViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();

  function setVue(next: CommuneViewMode) {
    saveCommuneView(next);
    const serialized = serializeCommuneViewParam(next);
    const query = serialized ? `?vue=${serialized}` : "";
    router.replace(`${pathname}${query}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <span className="text-sm text-slate-500">Affichage :</span>
      {VIEW_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setVue(mode)}
          aria-pressed={vue === mode}
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            vue === mode
              ? "bg-blue-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300"
          }`}
        >
          {communeViewLabel(mode)}
        </button>
      ))}
      <Link
        href={`/compare?codes=${inseeCode}`}
        className="ml-auto text-sm font-medium text-blue-700 hover:underline"
      >
        Ajouter au comparateur →
      </Link>
    </div>
  );
}
