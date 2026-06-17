"use client";

import type { NavSection } from "@/lib/ux/sections";

interface SectionNavProps {
  sections: NavSection[];
}

export function SectionNav({ sections }: SectionNavProps) {
  function scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <nav
      aria-label="Sections de la fiche"
      className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-slate-100/95 px-4 py-2 backdrop-blur-sm"
    >
      <ul className="flex gap-2 overflow-x-auto pb-1 text-sm">
        {sections.map((section) => (
          <li key={section.id} className="shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection(section.id)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
