"use client";

import { useEffect } from "react";
import { saveRecentCommune } from "@/lib/ux/recent-communes";

interface RecentCommuneTrackerProps {
  inseeCode: string;
  name: string;
  departmentCode?: string;
}

export function RecentCommuneTracker({
  inseeCode,
  name,
  departmentCode,
}: RecentCommuneTrackerProps) {
  useEffect(() => {
    saveRecentCommune({ inseeCode, name, departmentCode });
  }, [inseeCode, name, departmentCode]);

  return null;
}
