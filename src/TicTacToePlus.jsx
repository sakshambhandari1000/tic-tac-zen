import React, { useEffect, useMemo, useState } from "react";

// ==========================
// TicTacToe+ — Creative XO
// Features:
// - PvP or Player vs CPU (simple heuristic bot)
// - Best-of-N rounds scoreboard (default N=3)
// - 3 Themes (Classic, Neon, Bamboo)
// - Motivational quotes on win / loss / draw
// - Smooth micro-animations with Tailwind
// - Mobile-friendly, single-file component
// Usage: Drop into your React app and render <TicTacToePlus />
// ==========================

const THEMES = {
  classic: {
    name: "Classic",
    board: "bg-slate-900",
    tile: "bg-slate-800 hover:bg-slate-700",
    x: "text-sky-400",
    o: "text-pink-400",
    accent: "from-sky-500 to-pink-500",
  },
  neon: {
    name: "Neon",
    board: "bg-black",
    tile: "bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-700",
    x: "text-emerald-400 drop-shadow-[0_0_8px_#34d399]",
    o: "text-fuchsia-400 drop-shadow-[0_0_8px_#e879f9]",
    accent: "from-emerald-500 to-fuchsia-500",
  },
  bamboo: {
    name: "Bamboo",
    board: "bg-lime-100",
    tile: "bg-lime-200 hover:bg-lime-300 ring-1 ring-lime-400",
    x: "text-emerald-700",
    o: "text-amber-700",
    accent: "from-emerald-500 to-amber-500",
  },
};

const QUOTES = {
  win: [
    "Cold start. Hot finish.",
    "Pressure is a privilege.",
    "Small wins stack big W's.",
    "Stay humble. Take the point.",
  ],
  loss: [
    "Reset. Refocus. Respond.",
    "L is for Learning.",
    "Next round is yours.",
    "Every miss maps the target.",
  ],
  draw: [
    "Stalemate is still data.",
    "Even odds. New plot.",
    "Balance achieved. Break it.",
    "No winner — yet.",
  ],
};

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winnerOf(squares) {
  for (const [a, b, c] of LINES) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { player: squares[a], line: [a, b, c] };
    }
  }
  return null;
}

function emptyIndices(sq) {
  return sq.map((v, i) => (v ? null : i)).filter((i) => i !== null);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Simple CPU: win > block > center > corner > random
function cpuMove(sq, cpuSymbol) {
  const human = cpuSymbol === "X" ? "O" : "X";

  // Try to win
  for (const [a, b, c] of LINES) {
    const line = [sq[a], sq[b], sq[c]];
    const idx = [a, b, c];
    if (line.filter((x) => x === cpuSymbol).length === 2 && line.includes(null)) {
      return idx[line.indexOf(null)];
    }
  }
  // Try to block
  for (const [a, b, c] of LINES) {
    const line = [sq[a], sq[b], sq[c]];
    const idx = [a, b, c];
    if (line.filter((x) => x === human).length === 2 && line.includes(null)) {
      return idx[line.indexOf(null)];
    }
  }
  // Take center
  if (!sq[4]) return 4;
  // Take a corner
  const corners = [0, 2, 6, 8].filter((i) => !sq[i]);
  if (corners.length) return pickRandom(corners);
  // Else random
  return pickRandom(emptyIndices(sq));
}

export default function TicTacToePlus() {
  const [themeKey, setThemeKey] = useState("classic");
  const theme = THEMES[themeKey];

  const [mode, setMode] = useState("pvp"); // 'pvp' | 'cpu'
  const [targetWins, setTargetWins] = useState(3);

  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [lockBoard, setLockBoard] = useState(false);
  const [highlight, setHighlight] = useState([]);

  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [round, setRound] = useState(1);
  const [toast, setToast] = useState("Welcome — tap a tile to start.");

  const current = useMemo(() => (xIsNext ? "X" : "O"), [xIsNext]);

  const result = useMemo(() => {
    const w = winnerOf(squares);
    if (w) return { type: "win", player: w.player, line: w.line };
    if (squares.every(Boolean)) return { type: "draw" };
    return null;
  }, [squares]);

  // Handle round end
  useEffect(() => {
    if (!result) return;

    setLockBoard(true);
    if (result.type === "win") {
      setHighlight(result.line);
      setScores((s) => ({ ...s, [result.player]: s[result.player] + 1 }));
      setToast(pickRandom(QUOTES.win) + `  → ${result.player} wins the round!`);
    } else if (result.type === "draw") {
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
      setToast(pickRandom(QUOTES.draw) + "  → Draw.");
    }

    const timeout = setTimeout(() => {
      // Match finished?
      if (scores.X + (result.type === "win" && result.player === "X" ? 1 : 0) >= targetWins ||
          scores.O + (result.type === "win" && result.player === "O" ? 1 : 0) >= targetWins) {
        // Keep the board locked; show match banner
        setToast(
          (result.type === "win" ? `${result.player}` : scores.X > scores.O ? "X" : scores.O > scores.X ? "O" : "Nobody") +
            " wins the match! Click New Match to play again."
        );
      } else {
        // Next round
        setSquares(Array(9).fill(null));
        setHighlight([]);
        setRound((r) => r + 1);
        setLockBoard(false);
      }
    }, 1100);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // CPU turn
  useEffect(() => {
    if (mode !== "cpu") return;
    if (lockBoard) return;
    if (result) return;

    const symbol = current;
    if (symbol === "O") {
      // CPU plays O by default (human is X)
      const t = setTimeout(() => {
        setSquares((sq) => {
          const idx = cpuMove(sq, "O");
          if (idx === undefined || idx === null) return sq; // safety
          const next = sq.slice();
          next[idx] = "O";
          return next;
        });
        setXIsNext(true);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [current, mode, lockBoard, result]);

  const handleClick = (i) => {
    if (lockBoard) return;
    if (squares[i] || result) return;
    setSquares((prev) => {
      const next = prev.slice();
      next[i] = current;
      return next;
    });
    setXIsNext((x) => !x);
  };

  const newMatch = () => {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    setLockBoard(false);
    setHighlight([]);
    setScores({ X: 0, O: 0, draws: 0 });
    setRound(1);
    setToast("Fresh match. Good luck.");
  };

  const statusText = () => {
    if (scores.X >= targetWins || scores.O >= targetWins) {
      return `${scores.X > scores.O ? "X" : "O"} wins the match!`;
    }
    if (result?.type === "win") return `${result.player} won the round!`;
    if (result?.type === "draw") return "Round drawn.";
    return `${current}'s turn`;
  };

  const tileClasses = (i) => {
    const base = `relative aspect-square flex items-center justify-center ${theme.tile} rounded-2xl transition-all duration-200 select-none`;
    const pulse = highlight.includes(i) ? "ring-2 ring-offset-2 ring-offset-transparent animate-pulse " : "";
    return `${base} ${pulse}`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className={`w-full max-w-3xl rounded-3xl shadow-xl overflow-hidden ${theme.board} text-white`}>
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              TicTacToe<span className={`bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}>+</span>
              <span className="ml-2 text-sm font-medium opacity-75">Best of {targetWins} · Round {round}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
              >
                <option value="pvp">PvP — Two Players</option>
                <option value="cpu">Solo — vs CPU (O)</option>
              </select>
              <select
                value={themeKey}
                onChange={(e) => setThemeKey(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
              >
                {Object.entries(THEMES).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
              <select
                value={String(targetWins)}
                onChange={(e) => setTargetWins(Number(e.target.value))}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
              >
                {[1, 2, 3, 5].map((n) => (
                  <option key={n} value={n}>Best of {n}</option>
                ))}
              </select>
              <button
                onClick={newMatch}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm"
              >
                New Match
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid md:grid-cols-2 gap-0">
          {/* Left: Board */}
          <div className="p-5 md:p-8">
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {squares.map((val, i) => (
                <button key={i} onClick={() => handleClick(i)} className={tileClasses(i)} disabled={lockBoard || Boolean(result)}>
                  <span
                    className={`text-5xl md:text-6xl font-black drop-shadow transition-transform duration-150 ${
                      val === "X" ? `${theme.x} scale-100` : val === "O" ? `${theme.o} scale-100` : "scale-95 opacity-80"
                    }`}
                  >
                    {val ?? ""}
                  </span>
                  {/* subtle grid lines */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="p-5 md:p-8 border-t md:border-l md:border-t-0 border-white/10">
            <div className="space-y-4">
              <div className="text-sm uppercase tracking-wide opacity-70">Status</div>
              <div className="text-xl md:text-2xl font-semibold">{statusText()}</div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-sm opacity-70">X</div>
                  <div className="text-3xl font-bold">{scores.X}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-sm opacity-70">Draws</div>
                  <div className="text-3xl font-bold">{scores.draws}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-sm opacity-70">O</div>
                  <div className="text-3xl font-bold">{scores.O}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm uppercase tracking-wide opacity-70 mb-2">Coach says</div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm leading-relaxed">
                  {toast}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setSquares(Array(9).fill(null));
                    setHighlight([]);
                    setLockBoard(false);
                    setXIsNext(true);
                    setToast("Round reset.");
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10"
                >
                  Reset Round
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href).catch(() => {});
                    setToast("Share link copied (if supported).");
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10"
                >
                  Share Link
                </button>
              </div>

              <div className="text-xs opacity-60 mt-6">
                Pro tip: switch to <span className="font-semibold">Neon</span> theme for extra drip ✨
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 md:p-6 border-t border-white/10 text-xs md:text-sm opacity-80">
          Built with React & Tailwind. Modes: PvP / CPU. Themes: Classic · Neon · Bamboo.
        </div>
      </div>
    </div>
  );
}

