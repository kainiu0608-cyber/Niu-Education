"use client";

import { useEffect, useRef, useState } from "react";

type Game = "menu" | "snake" | "pong" | "reaction" | "memory" | "clicker";

export default function GamesPage() {
  const [game, setGame] = useState<Game>("menu");

  return (
    <main className="min-h-screen bg-[#050716] text-white p-5">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="inline-block mb-5 rounded-full border border-white/15 px-4 py-2 font-bold hover:bg-white/10">
          ← Back to Niu Education
        </a>

        <h1 className="text-5xl font-black mb-2">🎮 Niu Games</h1>
        <p className="text-gray-300 mb-8">Real games built into your website. No outside links.</p>

        {game === "menu" && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["snake", "🐍 Snake", "Eat food, grow longer, don’t crash."],
              ["pong", "🏓 Pong", "Classic paddle game."],
              ["reaction", "⚡ Reaction Test", "Click as fast as possible."],
              ["memory", "🧠 Memory Match", "Match all the cards."],
              ["clicker", "🔥 Niu Clicker", "Click to earn XP."],
            ].map(([id, title, desc]) => (
              <button
                key={id}
                onClick={() => setGame(id as Game)}
                className="rounded-3xl border border-white/15 bg-white/10 p-6 text-left hover:bg-white/20"
              >
                <h2 className="text-3xl font-black">{title}</h2>
                <p className="mt-2 text-gray-300">{desc}</p>
                <p className="mt-5 font-black text-cyan-300">Play →</p>
              </button>
            ))}
          </div>
        )}

        {game !== "menu" && (
          <button onClick={() => setGame("menu")} className="mb-5 rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">
            ← Game Menu
          </button>
        )}

        {game === "snake" && <Snake />}
        {game === "pong" && <Pong />}
        {game === "reaction" && <Reaction />}
        {game === "memory" && <Memory />}
        {game === "clicker" && <Clicker />}
      </div>
    </main>
  );
}

function Snake() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const direction = useRef({ x: 1, y: 0 });
  const snake = useRef([{ x: 8, y: 8 }]);
  const food = useRef({ x: 15, y: 10 });
  const dead = useRef(false);

  function reset() {
    snake.current = [{ x: 8, y: 8 }];
    food.current = { x: 15, y: 10 };
    direction.current = { x: 1, y: 0 };
    dead.current = false;
    setScore(0);
  }

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "ArrowUp") direction.current = { x: 0, y: -1 };
      if (e.key === "ArrowDown") direction.current = { x: 0, y: 1 };
      if (e.key === "ArrowLeft") direction.current = { x: -1, y: 0 };
      if (e.key === "ArrowRight") direction.current = { x: 1, y: 0 };
    }

    window.addEventListener("keydown", key);

    const loop = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas || dead.current) return;

      const ctx = canvas.getContext("2d")!;
      const size = 20;
      const grid = 25;

      const head = snake.current[0];
      const next = {
        x: head.x + direction.current.x,
        y: head.y + direction.current.y,
      };

      if (
        next.x < 0 ||
        next.y < 0 ||
        next.x >= grid ||
        next.y >= grid ||
        snake.current.some((s) => s.x === next.x && s.y === next.y)
      ) {
        dead.current = true;
        return;
      }

      snake.current.unshift(next);

      if (next.x === food.current.x && next.y === food.current.y) {
        setScore((s) => s + 1);
        food.current = {
          x: Math.floor(Math.random() * grid),
          y: Math.floor(Math.random() * grid),
        };
      } else {
        snake.current.pop();
      }

      ctx.fillStyle = "#050716";
      ctx.fillRect(0, 0, 500, 500);

      ctx.fillStyle = "#22d3ee";
      snake.current.forEach((s) => ctx.fillRect(s.x * size, s.y * size, size - 2, size - 2));

      ctx.fillStyle = "#f97316";
      ctx.fillRect(food.current.x * size, food.current.y * size, size - 2, size - 2);
    }, 110);

    return () => {
      window.removeEventListener("keydown", key);
      clearInterval(loop);
    };
  }, []);

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6">
      <h2 className="text-3xl font-black mb-2">🐍 Snake</h2>
      <p className="mb-4 text-gray-300">Use arrow keys. Score: {score}</p>
      <canvas ref={canvasRef} width={500} height={500} className="rounded-2xl bg-black max-w-full" />
      <button onClick={reset} className="mt-4 rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">
        Restart
      </button>
    </div>
  );
}

function Pong() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerY = useRef(170);
  const ball = useRef({ x: 300, y: 200, vx: 5, vy: 4 });
  const aiY = useRef(170);
  const [score, setScore] = useState("0 - 0");
  const playerScore = useRef(0);
  const aiScore = useRef(0);

  useEffect(() => {
    function move(e: MouseEvent) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      playerY.current = e.clientY - rect.top - 40;
    }

    window.addEventListener("mousemove", move);

    const loop = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;

      ball.current.x += ball.current.vx;
      ball.current.y += ball.current.vy;

      if (ball.current.y < 0 || ball.current.y > 400) ball.current.vy *= -1;

      aiY.current += (ball.current.y - aiY.current - 40) * 0.08;

      if (
        ball.current.x < 30 &&
        ball.current.y > playerY.current &&
        ball.current.y < playerY.current + 80
      ) {
        ball.current.vx *= -1;
      }

      if (
        ball.current.x > 570 &&
        ball.current.y > aiY.current &&
        ball.current.y < aiY.current + 80
      ) {
        ball.current.vx *= -1;
      }

      if (ball.current.x < 0) {
        aiScore.current++;
        ball.current = { x: 300, y: 200, vx: 5, vy: 4 };
      }

      if (ball.current.x > 600) {
        playerScore.current++;
        ball.current = { x: 300, y: 200, vx: -5, vy: 4 };
      }

      setScore(`${playerScore.current} - ${aiScore.current}`);

      ctx.fillStyle = "#050716";
      ctx.fillRect(0, 0, 600, 400);

      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(20, playerY.current, 10, 80);

      ctx.fillStyle = "#a855f7";
      ctx.fillRect(570, aiY.current, 10, 80);

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }, 16);

    return () => {
      window.removeEventListener("mousemove", move);
      clearInterval(loop);
    };
  }, []);

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6">
      <h2 className="text-3xl font-black mb-2">🏓 Pong</h2>
      <p className="mb-4 text-gray-300">Move your mouse. Score: {score}</p>
      <canvas ref={canvasRef} width={600} height={400} className="rounded-2xl bg-black max-w-full" />
    </div>
  );
}

function Reaction() {
  const [status, setStatus] = useState<"ready" | "wait" | "go" | "done">("ready");
  const [time, setTime] = useState<number | null>(null);
  const start = useRef(0);

  function begin() {
    setStatus("wait");
    setTime(null);
    setTimeout(() => {
      start.current = Date.now();
      setStatus("go");
    }, Math.random() * 3000 + 1500);
  }

  function click() {
    if (status === "go") {
      setTime(Date.now() - start.current);
      setStatus("done");
    } else if (status === "wait") {
      setStatus("ready");
      setTime(-1);
    }
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6">
      <h2 className="text-3xl font-black mb-4">⚡ Reaction Test</h2>

      <button
        onClick={status === "ready" || status === "done" ? begin : click}
        className={`h-80 w-full rounded-3xl text-4xl font-black ${
          status === "go" ? "bg-green-400 text-black" : "bg-purple-400 text-black"
        }`}
      >
        {status === "ready" && "Click to start"}
        {status === "wait" && "Wait..."}
        {status === "go" && "CLICK!"}
        {status === "done" && "Play again"}
      </button>

      {time !== null && (
        <p className="mt-4 text-2xl font-black">
          {time === -1 ? "Too early 💀" : `${time}ms`}
        </p>
      )}
    </div>
  );
}

function Memory() {
  const emojis = ["🔥", "🎓", "⚡", "🧠", "📚", "🎮"];
  const [cards, setCards] = useState(() =>
    [...emojis, ...emojis].sort(() => Math.random() - 0.5)
  );
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);

  function flip(i: number) {
    if (flipped.includes(i) || matched.includes(i)) return;

    const next = [...flipped, i];
    setFlipped(next);

    if (next.length === 2) {
      if (cards[next[0]] === cards[next[1]]) {
        setMatched((m) => [...m, ...next]);
      }
      setTimeout(() => setFlipped([]), 700);
    }
  }

  function reset() {
    setCards([...emojis, ...emojis].sort(() => Math.random() - 0.5));
    setFlipped([]);
    setMatched([]);
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6">
      <h2 className="text-3xl font-black mb-4">🧠 Memory Match</h2>

      <div className="grid grid-cols-3 gap-4 max-w-xl">
        {cards.map((card, i) => {
          const show = flipped.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              className="h-28 rounded-2xl bg-gradient-to-br from-cyan-300 to-purple-400 text-4xl font-black text-black"
            >
              {show ? card : "?"}
            </button>
          );
        })}
      </div>

      <button onClick={reset} className="mt-5 rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">
        Restart
      </button>
    </div>
  );
}

function Clicker() {
  const [xp, setXp] = useState(0);
  const level = Math.floor(xp / 100) + 1;

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6 text-center">
      <h2 className="text-4xl font-black mb-2">🔥 Niu Clicker</h2>
      <p className="text-gray-300 mb-6">Click to earn XP and level up.</p>

      <p className="text-6xl font-black text-cyan-300 mb-2">{xp} XP</p>
      <p className="text-2xl font-black mb-8">Level {level}</p>

      <button
        onClick={() => setXp((x) => x + 10)}
        className="h-60 w-60 rounded-full bg-gradient-to-br from-cyan-300 via-purple-400 to-orange-400 text-4xl font-black text-black shadow-2xl active:scale-95"
      >
        CLICK
      </button>
    </div>
  );
}