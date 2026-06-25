"use client";

import { useHideSensitiveIndicators } from "@/lib/ux/sensitive-indicators";

export function SensitiveIndicatorsToggle() {
  const { hideSensitive, setHideSensitive } = useHideSensitiveIndicators();

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 print:hidden">
      <input
        type="checkbox"
        checked={hideSensitive}
        onChange={(event) => setHideSensitive(event.target.checked)}
        className="rounded border-slate-300 text-blue-700 focus:ring-blue-200"
      />
      Masquer les indicateurs sensibles ou peu robustes
    </label>
  );
}
