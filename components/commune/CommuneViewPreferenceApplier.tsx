"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { serializeCommuneViewParam } from "@/lib/ux/commune-view";
import { readStoredCommuneView } from "@/lib/ux/commune-view-store";

/** Applique la vue mémorisée si l'URL n'a pas de param `vue`. */
export function CommuneViewPreferenceApplier() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.has("vue")) {
      return;
    }

    const stored = readStoredCommuneView();
    if (!stored || stored === "synthese") {
      return;
    }

    const serialized = serializeCommuneViewParam(stored);
    if (!serialized) {
      return;
    }

    router.replace(`${pathname}?vue=${serialized}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
