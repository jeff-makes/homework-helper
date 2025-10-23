import React, { useEffect, useMemo, useRef, useState } from "react";

const MAX_ALT = 8848;
const STEP_GAIN_BASE = 260;
const WRONG_PENALTY = 120;
const FOOD_WATER_MAX = 10;
const FOOD_WATER_CORRECT_GAIN = 2;
const FOOD_WATER_WRONG_LOSS = 2;
const FOOD_WATER_TICK_INTERVAL = 4000;
const TICK_MS = 250;

const CAMPS: Array<[number, string]> = [
  [0, "Base Camp (5,364 m) — prayer flags flutter. Sherpas smile."],
  [2000, "Camp I — crevasses behind you, Khumbu Icefall conquered."],
  [4000, "Camp II — Western Cwm blazing bright with sunlight."],
  [6000, "Camp III — Lhotse Face looms like a wall of ice."],
  [7800, "Camp IV — Death Zone. Calm breath, clear mind."],
  [MAX_ALT, "SUMMIT! Yeti tracks in the snow… did you see that?!"],
];

const MOUNTAIN_ART = String.raw`
                      /\
                     /  \
                    /\   \
                   /  \   \
                  /\   \   \
                 /  \   \   \
                /\   \   \   \
               /  \   \   \   \
              /\   \   \   \   \
             /  \   \   \   \   \
            /\   \   \   \   \   \
           /  \   \   \   \   \   \
          /\   \   \   \   \   \   \
         /  \   \   \   \   \   \   \
        /\   \   \   \   \   \   \   \
       /  \   \   \   \   \   \   \   \
      /\   \   \   \   \   \   \   \   \
     /  \   \   \   \   \   \   \   \   \
    /\   \   \   \   \   \   \   \   \   \
   /  \   \   \   \   \   \   \   \   \   \
  /\   \   \   \   \   \   \   \   \   \   \
 /  \   \   \   \   \   \   \   \   \   \   \
/____\___\___\___\___\___\___\___\___\___\___\
`;

const MOUNTAIN_LINES = MOUNTAIN_ART.split("\n").filter((line) => line.trim() !== "").length;

const YETI = String.raw`
      __     __
     /  \~~~/  \
 ,----(     ..    )
/      \__     __/
\_        \___/
  \_____       \
        \_______\   ← Yeti???
`;

const HELICOPTER = String.raw`
        __|__
 --o--o--(_)--o--o--
       /_/ \_\
  Rescue from Base Camp!
`;

type ScreenState = "intro" | "play" | "summary";
type FeedbackState = "none" | "correct" | "incorrect";

function parseTablesChoice(input: string): number[] {
  const normalized = input.trim().toLowerCase();
  if (["all", "everything", "any"].includes(normalized)) {
    return Array.from({ length: 10 }, (_, index) => index + 1);
  }

  const chosen = new Set<number>();
  const parts = normalized.replace(/\s+/g, "").split(",").filter(Boolean);
  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-", 2);
      const start = Number(a);
      const end = Number(b);
      if (Number.isInteger(start) && Number.isInteger(end)) {
        const lower = Math.min(start, end);
        const upper = Math.max(start, end);
        for (let value = lower; value <= upper; value += 1) {
          if (value >= 1 && value <= 10) {
            chosen.add(value);
          }
        }
      }
    } else {
      const value = Number(part);
      if (Number.isInteger(value) && value >= 1 && value <= 10) {
        chosen.add(value);
      }
    }
  }

  return chosen.size
    ? Array.from(chosen).sort((a, b) => a - b)
    : Array.from({ length: 10 }, (_, index) => index + 1);
}

function altitudeToLane(altitude: number): number {
  const ratio = Math.max(0, Math.min(1, altitude / MAX_ALT));
  return Math.floor((1 - ratio) * (MOUNTAIN_LINES - 1));
}

function currentLevel(altitude: number): number {
  const thresholds = [0, 2000, 4000, 6000, 7800];
  let level = 0;
  thresholds.forEach((threshold, index) => {
    if (altitude >= threshold) {
      level = index;
    }
  });
  return Math.min(level, 4);
}

function gainForCorrect(level: number, currentStreak: number): number {
  return Math.trunc(
    STEP_GAIN_BASE * (1 + 0.15 * level) * (1 + 0.08 * Math.max(0, currentStreak - 1)),
  );
}

function renderMountain(altitude: number): string {
  const lines = MOUNTAIN_ART.split("\n").filter((line) => line.trim() !== "");
  const laneIndex = altitudeToLane(altitude);
  const row = lines[laneIndex]?.split("") ?? [];
  const marker = "🧗";
  let position: number | null = null;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === "/" || character === "_" || character === "\\") {
      position = index;
      break;
    }
  }

  const finalPosition = position ?? Math.max(0, Math.floor(row.length / 2));
  if (row.length > 0) {
    row[finalPosition] = marker;
    lines[laneIndex] = row.join("");
  }

  return lines.join("\n");
}

function nextCampText(altitude: number): string {
  for (const [threshold, label] of CAMPS) {
    if (altitude < threshold) {
      return `Next: ${label}`;
    }
  }
  return "You are at the SUMMIT!";
}

function makeQuestion(tables: number[], level: number): { q: string; ans: number } {
  const table = tables[Math.floor(Math.random() * tables.length)];
  const randomBetween = (lower: number, upper: number) =>
    Math.floor(Math.random() * (upper - lower + 1)) + lower;

  if (level === 0) {
    const value = randomBetween(1, 5);
    return { q: `${table} × ${value} = ?`, ans: table * value };
  }
  if (level === 1) {
    const value = randomBetween(3, 8);
    return { q: `${table} × ${value} = ?`, ans: table * value };
  }
  if (level === 2) {
    const value = randomBetween(5, 10);
    return { q: `${table} × ${value} = ?`, ans: table * value };
  }
  if (level === 3) {
    const value = randomBetween(6, 10);
    return { q: `${table} × ${value} = ?`, ans: table * value };
  }
  const value = Math.max(8, randomBetween(8, 10));
  return { q: `${table} × ${value} = ?`, ans: table * value };
}

function formatEquation(question: string, answer: number): string {
  return question.replace("?", answer.toString());
}

function meterColorClass(value: number): string {
  const ratio = value / FOOD_WATER_MAX;
  if (ratio <= 0.2) {
    return "text-red-600";
  }
  if (ratio <= 0.4) {
    return "text-orange-500";
  }
  if (ratio <= 0.6) {
    return "text-amber-500";
  }
  return "text-slate-900";
}

export default function YetiMathPage(): JSX.Element {
  const [screen, setScreen] = useState<ScreenState>("intro");
  const [tablesInput, setTablesInput] = useState("2,3,4-6");
  const [tables, setTables] = useState<number[]>([2, 3, 4, 5, 6]);

  const [altitude, setAltitude] = useState(0);
  const [food, setFood] = useState(FOOD_WATER_MAX);
  const [water, setWater] = useState(FOOD_WATER_MAX);
  const [streak, setStreak] = useState(0);
  const [bestAltitude, setBestAltitude] = useState(0);

  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<number | null>(null);
  const [userGuess, setUserGuess] = useState("");
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [feedback, setFeedback] = useState<FeedbackState>("none");
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState<number | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string>("");
  const [rescueTriggered, setRescueTriggered] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);
  const drainAccumulatorRef = useRef(0);
  const [sessionBestAltitude, setSessionBestAltitude] = useState(0);
  const [sessionBestSummit, setSessionBestSummit] = useState<number | null>(null);

  const toastRef = useRef<number | null>(null);

  useEffect(() => {
    if (screen === "play") {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [screen, question]);

  const nextTurn = () => {
    const level = currentLevel(altitude);
    const { q, ans } = makeQuestion(tables, level);
    setQuestion(q);
    setAnswer(ans);
    setUserGuess("");
    setMessage("");
  };

  const startTimer = () => {
    setElapsed(0);
    drainAccumulatorRef.current = 0;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setElapsed((previous) => previous + TICK_MS / 1000);
      drainAccumulatorRef.current += TICK_MS;
      if (drainAccumulatorRef.current >= FOOD_WATER_TICK_INTERVAL) {
        const steps = Math.floor(drainAccumulatorRef.current / FOOD_WATER_TICK_INTERVAL);
        drainAccumulatorRef.current -= steps * FOOD_WATER_TICK_INTERVAL;
        if (steps > 0) {
          setFood((previous) => Math.max(0, previous - steps));
          setWater((previous) => Math.max(0, previous - steps));
        }
      }
    }, TICK_MS);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startGame = () => {
    const parsedTables = parseTablesChoice(tablesInput);
    setTables(parsedTables);

    if (toastRef.current) {
      window.clearTimeout(toastRef.current);
      toastRef.current = null;
    }

    setFeedback("none");
    setMessage("");
    setAltitude(0);
    setFood(FOOD_WATER_MAX);
    setWater(FOOD_WATER_MAX);
    setStreak(0);
    setBestAltitude(0);
    setRescueTriggered(false);
    setScreen("play");
    startTimer();
    window.setTimeout(() => nextTurn(), 0);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (answer == null) {
      return;
    }

    const guessNumber = Number(userGuess);
    if (!Number.isFinite(guessNumber)) {
      setMessage("Enter a number (the wind howls…)");
      return;
    }

    if (guessNumber === answer) {
      setLastCorrectAnswer(null);
      setLastQuestion("");
      const level = currentLevel(altitude);
      const newStreak = streak + 1;
      const climb = gainForCorrect(level, newStreak);
      const newAltitude = Math.min(MAX_ALT, altitude + climb);
      setAltitude(newAltitude);
      setStreak(newStreak);
      setFood((previous) => Math.min(FOOD_WATER_MAX, previous + FOOD_WATER_CORRECT_GAIN));
      setWater((previous) => Math.min(FOOD_WATER_MAX, previous + FOOD_WATER_CORRECT_GAIN));
      setBestAltitude((previous) => Math.max(previous, newAltitude));
      setMessage(`✅ Correct! You climb ${climb} m. Supplies boosted.`);
      setFeedback("correct");

      if (newAltitude >= MAX_ALT) {
        stopTimer();
        setSessionBestAltitude((previous) => Math.max(previous, newAltitude));
        setSessionBestSummit((previous) =>
          previous == null ? elapsed : Math.min(previous, elapsed),
        );
        window.setTimeout(() => setScreen("summary"), 1200);
        return;
      }

      if (toastRef.current) {
        window.clearTimeout(toastRef.current);
        toastRef.current = null;
      }
      toastRef.current = window.setTimeout(() => {
        setFeedback("none");
        nextTurn();
        toastRef.current = null;
      }, 1200);
    } else {
      const newAltitude = Math.max(0, altitude - WRONG_PENALTY);
      setAltitude(newAltitude);
      setStreak(0);
      setFood((previous) => Math.max(0, previous - FOOD_WATER_WRONG_LOSS));
      setWater((previous) => Math.max(0, previous - FOOD_WATER_WRONG_LOSS));
      setLastQuestion(question);
      setLastCorrectAnswer(answer);
      const equation = formatEquation(question, answer);
      setMessage(
        `💡 Almost! The mountain asked for ${equation}. You slip ${WRONG_PENALTY} m and drop some supplies, but you've got this.`,
      );
      setFeedback("incorrect");
    }
  };

  const mountain = useMemo(() => renderMountain(altitude), [altitude]);
  const nextCamp = useMemo(() => nextCampText(altitude), [altitude]);
  const hud = useMemo(() => {
    const time = new Date(Math.floor(elapsed) * 1000).toISOString().substring(14, 19);
    const fastestSummit =
      sessionBestSummit != null
        ? new Date(Math.floor(sessionBestSummit) * 1000).toISOString().substring(14, 19)
        : null;

    const renderMeter = (label: string, value: number) => {
      const filled = "█".repeat(value);
      const empty = "·".repeat(FOOD_WATER_MAX - value);
      const colorClass = meterColorClass(value);
      return (
        <span className="flex items-center gap-1">
          <span className={`text-xs sm:text-sm ${colorClass}`}>{label}:</span>
          <span className="font-mono text-xs sm:text-sm" aria-hidden="true">
            {filled && <span className={colorClass}>{filled}</span>}
            {empty && <span className="text-slate-300">{empty}</span>}
          </span>
          <span className="sr-only">
            {label} {value} out of {FOOD_WATER_MAX}
          </span>
        </span>
      );
    };

    return (
      <div className="grid gap-y-1 gap-x-4 sm:grid-cols-2 sm:items-center">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs font-semibold sm:text-sm">
            ALT: {altitude} m / {MAX_ALT} m
          </span>
          {renderMeter("FOOD", food)}
          {renderMeter("WATER", water)}
        </div>
        <div className="flex flex-col gap-1 text-xs sm:items-end sm:text-sm sm:text-right">
          <span>STREAK: {streak}</span>
          <span>⏱️ {time}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end">
            <span>Session Best: {sessionBestAltitude} m</span>
            {fastestSummit && <span>• Fastest Summit: {fastestSummit}</span>}
          </span>
        </div>
      </div>
    );
  }, [altitude, food, water, streak, elapsed, sessionBestAltitude, sessionBestSummit]);

  const campReached = useMemo(() => {
    for (const [threshold, label] of CAMPS) {
      if (threshold !== 0 && threshold !== MAX_ALT && Math.abs(altitude - threshold) <= 60) {
        return `Camp reached: ${label}`;
      }
    }
    return "";
  }, [altitude]);

  useEffect(() => {
    if (screen === "play" && (food === 0 || water === 0) && !rescueTriggered) {
      setRescueTriggered(true);
      setMessage(
        "🚁 Supplies depleted! Base camp swoops in with a helicopter before you become a popsicle.",
      );
      setFeedback("none");
      setBestAltitude((previous) => Math.max(previous, altitude));
      stopTimer();
      setSessionBestAltitude((previous) => Math.max(previous, bestAltitude, altitude));
      window.setTimeout(() => setScreen("summary"), 1500);
    }
  }, [food, water, screen, bestAltitude, altitude, rescueTriggered]);

  useEffect(
    () => () => {
      stopTimer();
      if (toastRef.current) {
        window.clearTimeout(toastRef.current);
        toastRef.current = null;
      }
    },
    [],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-slate-100 px-3 py-4 text-slate-800 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
        <header className="text-center">
          <div className="inline-block rounded-2xl bg-slate-900 px-3 py-2 font-mono text-base tracking-wide text-sky-100 shadow sm:px-4 sm:py-2.5 sm:text-lg md:text-xl">
            ║ YETI MATH: EVEREST ║
          </div>
        </header>

        {screen === "intro" && (
          <section className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm sm:p-5">
                <p className="leading-relaxed">
                  You are a young Nepali climber with a bold plan: prove to your village that Yetis exist.
                  The only way is to summit Everest and bring back a sketch of what you saw.
                </p>
                <p className="mt-3">But the mountain is harsh. Earn FOOD and WATER by solving multiplication.</p>
              </div>

              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm sm:p-5">
                <label className="block text-sm font-semibold">Choose multiplication tables (1–10)</label>
                <p className="mb-2 text-xs text-slate-500">
                  Examples: <code>all</code> · <code>2,3,7</code> · <code>4-6</code> ·<code>2,5,8-10</code>
                </p>
                <input
                  className="w-full rounded-xl border px-3 py-2 font-mono shadow-sm focus:outline-none focus:ring"
                  value={tablesInput}
                  onChange={(event) => setTablesInput(event.target.value)}
                  placeholder="all"
                />
                <button
                  onClick={startGame}
                  className="mt-4 w-full rounded-2xl bg-sky-600 px-4 py-2 font-semibold text-white shadow hover:bg-sky-700 sm:w-auto"
                >
                  Start Ascent
                </button>
              </div>

              <pre className="rounded-2xl border bg-white/80 p-3 text-[10px] leading-[1.1rem] whitespace-pre shadow-sm sm:text-xs">{YETI}</pre>
            </div>

            <div className="rounded-2xl border bg-white/80 p-4 shadow-inner">
              <pre className="whitespace-pre text-[9px] font-mono leading-4 sm:text-[10px] sm:leading-[1.15rem] md:text-sm md:leading-5">{MOUNTAIN_ART}</pre>
            </div>
          </section>
        )}
        {screen === "play" && (
          <section className="flex flex-col gap-3 sm:gap-4">
            <div className="rounded-xl border bg-white px-3 py-2 font-mono text-[10px] shadow sm:text-xs md:text-sm">{hud}</div>
            <div className="rounded-2xl border bg-white shadow-inner">
              <pre className="whitespace-pre px-2 py-3 text-[9px] font-mono leading-4 sm:px-3 sm:py-4 sm:text-[10px] sm:leading-[1.15rem] md:text-sm md:leading-5 select-none">{mountain}</pre>
            </div>
            <div className="text-sm text-slate-700">
              <p>{nextCamp}</p>
              {campReached && <p className="mt-1 font-medium text-emerald-700">{campReached}</p>}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 rounded-2xl border bg-white/80 p-3 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="flex items-baseline gap-2 sm:items-center">
                <label className="font-mono text-sm" htmlFor="yeti-answer">
                  Q)
                </label>
                <span className="font-mono text-base whitespace-pre sm:text-lg">{question}</span>
              </div>
              <div className="flex w-full gap-2 sm:w-auto sm:flex-none">
                <input
                  id="yeti-answer"
                  ref={inputRef}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-10 w-full flex-1 rounded-xl border px-3 py-2 font-mono text-base shadow-sm focus:outline-none focus:ring disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:text-lg"
                  placeholder="answer"
                  value={userGuess}
                  onChange={(event) => setUserGuess(event.target.value.replace(/[^0-9-]/g, ""))}
                  aria-label="answer"
                  disabled={feedback !== "none"}
                />
                <button
                  className="h-10 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-60 hover:bg-sky-700 sm:h-11 sm:text-base"
                  type="submit"
                  disabled={feedback !== "none"}
                >
                  Submit
                </button>
              </div>
              <button
                type="button"
                className="h-10 rounded-2xl bg-slate-200 px-3 py-2 text-sm shadow hover:bg-slate-300 sm:h-11 sm:text-base"
                onClick={() => {
                  stopTimer();
                  if (toastRef.current) {
                    window.clearTimeout(toastRef.current);
                    toastRef.current = null;
                  }
                  setFeedback("none");
                  setSessionBestAltitude((previous) => Math.max(previous, bestAltitude));
                  setScreen("summary");
                }}
              >
                Quit
              </button>
            </form>

            {message && (
              <div className="mt-2 rounded-xl border bg-white/90 p-3 text-sm shadow-sm">{message}</div>
            )}

            {rescueTriggered && screen === "play" && (
              <pre className="mt-3 rounded-xl border bg-white/80 p-3 text-xs leading-5 whitespace-pre">
                {HELICOPTER}
              </pre>
            )}

            {feedback === "incorrect" && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-[90%] max-w-md rounded-2xl border bg-white p-5 shadow-xl">
                  <div className="mb-2 text-lg font-semibold">Answer Check</div>
                  <div className="mb-4 text-sm leading-relaxed">{message}</div>
                  {lastQuestion && lastCorrectAnswer != null && (
                    <div className="mb-4 text-sm text-slate-700">
                      Problem recap: <span className="font-semibold">{formatEquation(lastQuestion, lastCorrectAnswer)}</span>
                    </div>
                  )}
                  <button
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-white shadow hover:bg-emerald-700"
                    onClick={() => {
                      setFeedback("none");
                      nextTurn();
                    }}
                  >
                    Got it — next question
                  </button>
                </div>
              </div>
            )}

            {feedback === "correct" && (
              <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-2 text-white shadow-lg">
                ✅ Correct!
              </div>
            )}
          </section>
        )}
        {screen === "summary" && (
          <section className="rounded-2xl border bg-white p-4 shadow">
            <h2 className="text-xl font-semibold">Expedition Log</h2>
            <p className="mt-2">
              Highest altitude (this run): <strong>{bestAltitude} m</strong>
            </p>
            <p className="mt-1">
              Time (this run): <strong>{new Date(Math.floor(elapsed) * 1000).toISOString().substring(14, 19)}</strong>
            </p>
            <p className="mt-1">
              Session best altitude: <strong>{sessionBestAltitude} m</strong>
            </p>
            {sessionBestSummit != null && (
              <p className="mt-1">
                Fastest summit (session): <strong>{new Date(Math.floor(sessionBestSummit) * 1000).toISOString().substring(14, 19)}</strong>
              </p>
            )}
            <p className="mt-1 text-slate-700">
              {bestAltitude >= MAX_ALT
                ? "Summit reached! Legend status. 🏅"
                : bestAltitude >= 6000
                ? "In the Death Zone — heroic effort."
                : bestAltitude >= 4000
                ? "High on the Lhotse Face. Solid climbing!"
                : bestAltitude >= 2000
                ? "Through the Icefall and into the Cwm. Great progress!"
                : "Every expedition teaches. Next time: tighter steps, deeper breaths."}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                className="px-4 py-2 rounded-2xl shadow bg-sky-600 text-white hover:bg-sky-700"
                onClick={() => {
                  if (toastRef.current) {
                    window.clearTimeout(toastRef.current);
                    toastRef.current = null;
                  }
                  setFeedback("none");
                  setScreen("intro");
                  setMessage("");
                  setRescueTriggered(false);
                }}
              >
                Play Again
              </button>
              <button
                className="px-4 py-2 rounded-2xl shadow bg-slate-200 hover:bg-slate-300"
                onClick={() => {
                  if (toastRef.current) {
                    window.clearTimeout(toastRef.current);
                    toastRef.current = null;
                  }
                  setFeedback("none");
                  setAltitude(0);
                  setFood(FOOD_WATER_MAX);
                  setWater(FOOD_WATER_MAX);
                  setStreak(0);
                  setBestAltitude(0);
                  setElapsed(0);
                  setRescueTriggered(false);
                  setScreen("play");
                  startTimer();
                  window.setTimeout(() => nextTurn(), 0);
                }}
              >
                Rematch (same tables)
              </button>
            </div>

            <pre className="mt-6 text-xs leading-5 whitespace-pre border rounded-xl p-3 bg-white/70">
              {rescueTriggered ? HELICOPTER : YETI}
            </pre>
          </section>
        )}

        <footer className="mt-6 text-center text-xs text-slate-500">
          Tip: You can type ranges like <code>4-7</code> or comma lists like <code>2,3,9</code>, or just <code>all</code>. Tables and questions cap at 10×10.
        </footer>
      </div>
    </div>
  );
}
