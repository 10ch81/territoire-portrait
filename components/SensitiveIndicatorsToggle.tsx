"use client";

import { useHideSensitiveIndicators } from "@/lib/ux/sensitive-indicators";

export function SensitiveIndicatorsToggle() {
  const { hideSensitive, setHideSensitive } = useHideSensitiveIndicators();

  return (
    <label
      htmlFor="hide-sensitive-indicators"
      className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 print:hidden"
    >
      <input
        id="hide-sensitive-indicators"
        type="checkbox"
        checked={hideSensitive}
        onChange={(event) => setHideSensitive(event.target.checked)}
        className="rounded border-slate-300 text-blue-700 focus:ring-2 focus:ring-blue-500"
      />
      Masquer les indicateurs sensibles ou peu robustes
    </label>
  );
}
