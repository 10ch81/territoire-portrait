import { getAcronymDefinition } from "@/lib/ux/acronyms";

interface AcronymTooltipProps {
  term: string;
  children?: React.ReactNode;
}

export function AcronymTooltip({ term, children }: AcronymTooltipProps) {
  const definition = getAcronymDefinition(term);

  if (!definition) {
    return <>{children ?? term}</>;
  }

  return (
    <abbr
      title={definition}
      className="cursor-help border-b border-dotted border-slate-400 no-underline"
    >
      {children ?? term}
    </abbr>
  );
}
