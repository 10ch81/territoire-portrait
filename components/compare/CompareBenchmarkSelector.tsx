"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  benchmarkShortLabel,
  type BenchmarkRef,
  parseBenchmarkParam,
  serializeBenchmarkParam,
} from "@/lib/ux/benchmark";

const BENCHMARK_OPTIONS: BenchmarkRef[] = ["epci", "departement", "similaires"];

interface CompareBenchmarkSelectorProps {
  className?: string;
}

export function CompareBenchmarkSelector({ className }: CompareBenchmarkSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = parseBenchmarkParam(searchParams.get("benchmark") ?? undefined);

  function setBenchmark(next: BenchmarkRef) {
    const params = new URLSearchParams(searchParams.toString());
    const serialized = serializeBenchmarkParam(next);
    if (serialized) {
      params.set("benchmark", serialized);
    } else {
      params.delete("benchmark");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <fieldset className={className ?? "mb-4 print:hidden"}>
      <legend className="text-sm font-medium text-slate-700">
        Référence comparative (KPI fiche — EPCI)
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {BENCHMARK_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setBenchmark(option)}
            aria-pressed={current === option}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              current === option
                ? "bg-slate-800 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300"
            }`}
          >
            {benchmarkShortLabel(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
