import { AcronymTooltip } from "./AcronymTooltip";

interface DataSectionProps {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  vintage?: string | number | null;
  children: React.ReactNode;
}

export function DataSection({
  id,
  title,
  subtitle,
  vintage,
  children,
}: DataSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        {vintage != null && vintage !== "" ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            Données {vintage}
          </span>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EnrichmentIntro() {
  return (
    <p className="text-sm text-slate-600">
      Sources complémentaires :{" "}
      <AcronymTooltip term="INSEE" />, <AcronymTooltip term="SIRENE" />,{" "}
      <AcronymTooltip term="BPE" />, Géorisques, <AcronymTooltip term="RPLS" />,{" "}
      <AcronymTooltip term="IRVE" />, <AcronymTooltip term="REI" />,{" "}
      <AcronymTooltip term="AAV" /> et <AcronymTooltip term="DVF" />.
    </p>
  );
}
