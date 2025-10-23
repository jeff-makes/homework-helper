import React, { useEffect, useMemo, useRef, useState } from "react";

const MAX_ALT = 8848;
const LANES = 22;
const STEP_GAIN_BASE = 260;
const WRONG_PENALTY = 120;
const FOOD_WATER_MAX = 10;
const FOOD_WATER_TURN_DRAIN = 1;
const FOOD_WATER_CORRECT_GAIN = 2;
const FOOD_WATER_WRONG_LOSS = 2;
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
 /____\___\___\___\___\___\___\___\___\ 
`;

const YETI = String.raw`
      __     __
     /  \~~~/  \
 ,----(     ..    )
/      \__     __/
\_        \___/ 
  \_____       \ 
        \_______\   ← Yeti???
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
  return Math.floor((1 - ratio) * (LANES - 1));
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

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [sessionBestAltitude, setSessionBestAltitude] = useState(0);
  const [sessionBestSummit, setSessionBestSummit] = useState<number | null>(null);

  const toastRef = useRef<number | null>(null);

  useEffect(() => {
    if (screen === "play") {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [screen, question]);

  const nextTurn = (drain = true) => {
    if (drain) {
      setFood((previous) => Math.max(0, previous - FOOD_WATER_TURN_DRAIN));
      setWater((previous) => Math.max(0, previous - FOOD_WATER_TURN_DRAIN));
    }
    const level = currentLevel(altitude);
    const { q, ans } = makeQuestion(tables, level);
    setQuestion(q);
    setAnswer(ans);
    setUserGuess("");
    setMessage("");
  };

  const startTimer = () => {
    setElapsed(0);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(
      () => setElapsed((previous) => previous + TICK_MS / 1000),
      TICK_MS,
    );
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
    setScreen("play");
    startTimer();
    window.setTimeout(() => nextTurn(false), 0);
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
      setLastCorrectAnswer(answer);
      setMessage(
        `✖️ Not quite. Correct was ${answer}. You slip ${WRONG_PENALTY} m and lose supplies.`,
      );
      setFeedback("incorrect");
    }
  };

  const mountain = useMemo(() => renderMountain(altitude), [altitude]);
  const nextCamp = useMemo(() => nextCampText(altitude), [altitude]);
  const hud = useMemo(() => {
    const foodBar = "█".repeat(food) + "·".repeat(FOOD_WATER_MAX - food);
    const waterBar = "█".repeat(water) + "·".repeat(FOOD_WATER_MAX - water);
    const time = new Date(Math.floor(elapsed) * 1000).toISOString().substring(14, 19);
    const summitBest =
      sessionBestSummit != null
        ? `  •  Fastest Summit: ${new Date(Math.floor(sessionBestSummit) * 1000)
            .toISOString()
            .substring(14, 19)}`
        : "";
    return `ALT: ${altitude} m / ${MAX_ALT} m    FOOD: ${foodBar}    WATER: ${waterBar}    STREAK: ${streak}  •  ⏱️ ${time}  •  Session Best: ${sessionBestAltitude} m${summitBest}`;
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
    if (screen === "play" && (food === 0 || water === 0)) {
      setMessage("You ran out of supplies and had to turn back. Rest and try again!");
      stopTimer();
      setSessionBestAltitude((previous) => Math.max(previous, bestAltitude));
      window.setTimeout(() => setScreen("summary"), 600);
    }
  }, [food, water, screen, bestAltitude]);

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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-slate-100 text-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-4 text-center">
          <div className="font-mono text-xl sm:text-2xl md:text-3xl bg-slate-900 text-sky-100 rounded-2xl px-4 py-3 inline-block shadow">
            ║ Y E T I  M A T H :  E V E R E S T ║
          </div>
        </header>

        {screen === "intro" && (
          <section className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <p className="leading-relaxed">
                You are a young Nepali climber with a bold plan: prove to your village that Yetis exist.
                The only way is to summit Everest and bring back a sketch of what you saw.
              </p>
              <p className="mt-3">But the mountain is harsh. Earn FOOD and WATER by solving multiplication.</p>

              <div className="mt-6">
                <label className="block text-sm font-semibold">Choose multiplication tables (1–10)</label>
                <p className="text-xs text-slate-500 mb-1">Examples: <code>all</code> · <code>2,3,7</code> · <code>4-6</code> · <code>2,5,8-10</code></p>
                <input
                  className="w-full font-mono rounded-xl border px-3 py-2 shadow-sm focus:outline-none focus:ring"
                  value={tablesInput}
                  onChange={(event) => setTablesInput(event.target.value)}
                  placeholder="all"
                />
                <button
                  onClick={startGame}
                  className="mt-4 px-4 py-2 rounded-2xl shadow bg-sky-600 text-white hover:bg-sky-700"
                >
                  Start Ascent
                </button>
              </div>

              <pre className="mt-6 text-xs leading-5 whitespace-pre border rounded-xl p-3 bg-white/70">{YETI}</pre>
            </div>

            <pre className="font-mono text-sm md:text-base leading-5 whitespace-pre border rounded-2xl p-4 bg-white/70 shadow-inner select-none">{MOUNTAIN_ART}</pre>
          </section>
        )}

        {screen === "play" && (
          <section>
            <div className="font-mono text-xs md:text-sm bg-white rounded-xl p-3 border shadow mb-3">{hud}</div>
            <pre className="font-mono text-sm md:text-base leading-5 whitespace-pre border rounded-2xl p-4 bg-white shadow-inner select-none">{mountain}</pre>
            <div className="mt-2 text-sm text-slate-700">{nextCamp}</div>
            {campReached && <div className="mt-2 text-emerald-700 font-medium">{campReached}</div>}

            <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3">
              <label className="font-mono">Q)</label>
              <span className="font-mono text-lg">{question}</span>
              <input
                ref={inputRef}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-28 font-mono text-lg rounded-xl border px-3 py-2 shadow-sm focus:outline-none focus:ring disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="answer"
                value={userGuess}
                onChange={(event) => setUserGuess(event.target.value.replace(/[^0-9-]/g, ""))}
                aria-label="answer"
                disabled={feedback !== "none"}
              />
              <button className="px-4 py-2 rounded-2xl shadow bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={feedback !== "none"}>
                Submit
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-2xl shadow bg-slate-200 hover:bg-slate-300"
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

            {message && <div className="mt-3 text-sm">{message}</div>}

            {feedback === "incorrect" && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-5 max-w-md w-[90%] shadow-xl border">
                  <div className="text-lg font-semibold mb-2">Answer Check</div>
                  <div className="text-sm mb-4">{message}</div>
                  {lastCorrectAnswer != null && (
                    <div className="text-sm text-slate-700 mb-4">
                      Correct answer: <strong>{lastCorrectAnswer}</strong>
                    </div>
                  )}
                  <button
                    className="px-4 py-2 rounded-2xl shadow bg-emerald-600 text-white hover:bg-emerald-700"
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
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg z-40">
                ✅ Correct!
              </div>
            )}
          </section>
        )}

        {screen === "summary" && (
          <section className="bg-white border rounded-2xl p-4 shadow">
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
                  setScreen("play");
                  startTimer();
                  window.setTimeout(() => nextTurn(false), 0);
                }}
              >
                Rematch (same tables)
              </button>
            </div>

            <pre className="mt-6 text-xs leading-5 whitespace-pre border rounded-xl p-3 bg-white/70">{YETI}</pre>
          </section>
        )}

        <footer className="mt-8 text-center text-xs text-slate-500">
          Tip: You can type ranges like <code>4-7</code> or comma lists like <code>2,3,9</code>, or just <code>all</code>. Tables and questions cap at 10×10.
        </footer>
      </div>
    </div>
  );
}
