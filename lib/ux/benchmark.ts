export type BenchmarkRef = "epci" | "departement" | "similaires";

const VALID_BENCHMARKS = new Set<BenchmarkRef>(["epci", "departement", "similaires"]);

export function parseBenchmarkParam(raw: string | undefined): BenchmarkRef {
  if (raw && VALID_BENCHMARKS.has(raw as BenchmarkRef)) {
    return raw as BenchmarkRef;
  }
  return "epci";
}

export function serializeBenchmarkParam(ref: BenchmarkRef): string | null {
  if (ref === "epci") {
    return null;
  }
  return ref;
}

export function isBenchmarkRef(value: string): value is BenchmarkRef {
  return VALID_BENCHMARKS.has(value as BenchmarkRef);
}

export function benchmarkLabel(ref: BenchmarkRef): string {
  switch (ref) {
    case "epci":
      return "moyenne EPCI";
    case "departement":
      return "moyenne départementale";
    case "similaires":
      return "communes similaires";
    default: {
      const _exhaustive: never = ref;
      return _exhaustive;
    }
  }
}

export function benchmarkShortLabel(ref: BenchmarkRef): string {
  switch (ref) {
    case "epci":
      return "EPCI";
    case "departement":
      return "dép.";
    case "similaires":
      return "similaires";
    default: {
      const _exhaustive: never = ref;
      return _exhaustive;
    }
  }
}
