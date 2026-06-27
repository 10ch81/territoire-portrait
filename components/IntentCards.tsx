import Link from "next/link";
import { USER_INTENTS } from "@/lib/ux/intents";

export function IntentCards() {
  return (
    <section className="space-y-4" aria-labelledby="intents-heading">
      <h2 id="intents-heading" className="text-base font-semibold text-slate-900">
        Par intention
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {USER_INTENTS.map((intent) => (
          <Link
            key={intent.id}
            href={intent.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            {...(intent.id === "explorer"
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            <h3 className="font-semibold text-slate-900">{intent.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{intent.description}</p>
            <span className="mt-3 inline-block text-sm font-medium text-blue-700">
              {intent.cta} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
