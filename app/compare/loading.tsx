export default function CompareLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
      <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
    </main>
  );
}
