import type { NextConfig } from "next";

const cacheTracingIncludes = [
  "./data/cache/*-by-commune.json",
  "./data/cache/bpe-type-labels.json",
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/commune/[codeInsee]": cacheTracingIncludes,
    "/api/analyze": cacheTracingIncludes,
    "/api/commune": cacheTracingIncludes,
  },
};

export default nextConfig;
