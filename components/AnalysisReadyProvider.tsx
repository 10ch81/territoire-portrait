"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface AnalysisReadyContextValue {
  ready: boolean;
  markReady: () => void;
}

const AnalysisReadyContext = createContext<AnalysisReadyContextValue>({
  ready: false,
  markReady: () => {},
});

export function AnalysisReadyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const value = useMemo(
    () => ({ ready, markReady: () => setReady(true) }),
    [ready],
  );

  return (
    <AnalysisReadyContext.Provider value={value}>
      {children}
    </AnalysisReadyContext.Provider>
  );
}

export function useAnalysisReady() {
  return useContext(AnalysisReadyContext);
}
