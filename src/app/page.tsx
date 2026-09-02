const setupItems = ["Next.js", "TypeScript", "pnpm", "Tailwind CSS"];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16">
      <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-12">
        <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-violet-600 uppercase">
          Unofficial Portfolio Demo
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          Liver Store Portfolio
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
          VTuber / Virtual Liver 向け EC
          ストアを題材にした、採用選考用の非公式・非商用デモです。
          実際の販売・注文・決済は行いません。
        </p>

        <ul
          className="mt-10 grid gap-3 sm:grid-cols-2"
          aria-label="導入済みの技術"
        >
          {setupItems.map((item) => (
            <li
              key={item}
              className="rounded-2xl bg-violet-50 px-5 py-4 font-medium text-violet-950"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
