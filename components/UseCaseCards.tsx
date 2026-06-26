"use client";

import Link from "next/link";
import { USE_CASE_EXAMPLES } from "@/lib/ux/recent-communes";

export function UseCaseCards() {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">
        Par cas d&apos;usage
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {USE_CASE_EXAMPLES.map((useCase) => (
          <Link
            key={useCase.id}
            href={`/commune/${useCase.inseeCode}?vue=detail#${useCase.anchor}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <h3 className="font-semibold text-slate-900">{useCase.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{useCase.description}</p>
            <span className="mt-3 inline-block text-sm font-medium text-blue-700">
              Voir un exemple →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
