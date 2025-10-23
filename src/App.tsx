import { Link, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import YetiMath from "./pages/YetiMath";

export default function App() {
  const location = useLocation();
  const showNav = !location.pathname.startsWith("/yeti-math");

  return (
    <div className="min-h-screen bg-slate-50">
      {showNav && (
        <nav className="border-b bg-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
            <Link to="/" className="font-semibold text-slate-800">Emma’s Homework Helper</Link>
            <div className="ml-auto flex gap-3 text-sm">
              <Link className="text-sky-700 hover:underline" to="/yeti-math">Yeti Math: Everest</Link>
              {/* future games can go here */}
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/yeti-math" element={<YetiMath />} />
        </Routes>
      </main>
    </div>
  );
}
