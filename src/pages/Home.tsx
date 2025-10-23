import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Yeti Math: Everest</h2>
        <p className="text-slate-600 mt-1">
          Practice 1–10 multiplication tables while “climbing” Everest. Correct answers boost supplies and altitude.
        </p>
        <Link
          to="/yeti-math"
          className="inline-block mt-4 px-4 py-2 rounded-2xl bg-sky-600 text-white hover:bg-sky-700 shadow"
        >
          Play
        </Link>
      </div>

      {/* Placeholder cards for future “boxes” */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm opacity-60">
        <h2 className="text-lg font-semibold">Coming soon</h2>
        <p className="text-slate-600 mt-1">Add more games here later.</p>
      </div>
    </section>
  );
}
