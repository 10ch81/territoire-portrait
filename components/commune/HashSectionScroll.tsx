"use client";

import { useAnalysisReady } from "@/components/AnalysisReadyProvider";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const MAX_SCROLL_ATTEMPTS = 24;

function scrollToHash(): boolean {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    return true;
  }

  const element = document.getElementById(hash);
  if (!element) {
    return false;
  }

  element.scrollIntoView({ behavior: "auto", block: "start" });
  return true;
}

function scheduleScrollToHash(): () => void {
  let cancelled = false;
  let attempts = 0;

  function tryScroll() {
    if (cancelled) {
      return;
    }
    if (scrollToHash() || attempts >= MAX_SCROLL_ATTEMPTS) {
      return;
    }
    attempts += 1;
    requestAnimationFrame(tryScroll);
  }

  tryScroll();
  return () => {
    cancelled = true;
  };
}

export function HashSectionScroll() {
  const pathname = usePathname();
  const { ready } = useAnalysisReady();

  useEffect(() => scheduleScrollToHash(), [pathname]);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    return scheduleScrollToHash();
  }, [ready]);

  useEffect(() => {
    function handleHashChange() {
      scheduleScrollToHash();
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return null;
}
