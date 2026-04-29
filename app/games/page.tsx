"use client";

import { useEffect, useRef, useState } from "react";

type Game = "menu" | "runner" | "slope" | "hoops";

export default function GamesPage() {
  const [game, setGame] = useState<Game>("menu");

  return (
    <main className="min-h-screen bg-[#050716] text-white p-5">
      <a href="/" className="inline-block mb-6 rounded-full border border-white/20 px-4 py-2 font-bold hover:bg-white/10">
        ← Back to Niu Education
      </a>

      {game === "menu" && (
        <>
          <h1 className="text-6xl font-black mb-2">🎮 Niu Games</h1>
          <p className="text-gray-300 mb-8">Original arcade games coded inside your website.</p>

          <div className="grid gap-6 md:grid-cols-3">
            <GameCard title="🏃 Niu Runner" desc="Subway-style lane runner. Dodge obstacles and collect coins." onClick={() => setGame("runner")} />
            <GameCard title="🟣 Neon Slope" desc="Slope-style speed dodger with neon graphics." onClick={() => setGame("slope")} />
            <GameCard title="🏀 Niu Hoops" desc="Basketball timing game. Hit green zone to score." onClick={() => setGame("hoops")} />
          </div>
        </>
      )}

      {game !== "menu" && (
        <button onClick={() => setGame("menu")} className="mb-5 rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">
          ← Game Menu
        </button>
      )}

      {game === "runner" && <RunnerGame />}
      {game === "slope" && <SlopeGame />}
      {game === "hoops" && <HoopsGame />}
    </main>
  );
}

function GameCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-6 text-left shadow-2xl hover:scale-[1.02] transition">
      <div className="mb-5 h-48 rounded-3xl bg-gradient-to-br from-cyan-300 via-purple-400 to-orange-400 flex items-center justify-center text-6xl">
        {title.split(" ")[0]}
      </div>
      <h2 className="text-3xl font-black">{title}</h2>
      <p className="mt-2 text-gray-300">{desc}</p>
      <p className="mt-5 font-black text-cyan-300">Play now →</p>
    </button>
  );
}

function RunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lane = useRef(1);
  const obstacles = useRef<any[]>([]);
  const coins = useRef<any[]>([]);
  const frame = useRef(0);
  const dead = useRef(false);
  const [score, setScore] = useState(0);

  function restart() {
    lane.current = 1;
    obstacles.current = [];
    coins.current = [];
    frame.current = 0;
    dead.current = false;
    setScore(0);
  }

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") lane.current = Math.max(0, lane.current - 1);
      if (e.key === "ArrowRight") lane.current = Math.min(2, lane.current + 1);
    }

    window.addEventListener("keydown", key);

    const loop = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas || dead.current) return;
      const ctx = canvas.getContext("2d")!;
      const w = canvas.width;
      const h = canvas.height;

      frame.current++;
      if (frame.current % 55 === 0) obstacles.current.push({ lane: Math.floor(Math.random() * 3), y: -80 });
      if (frame.current % 35 === 0) coins.current.push({ lane: Math.floor(Math.random() * 3), y: -50 });

      ctx.fillStyle = "#070b18";
      ctx.fillRect(0, 0, w, h);

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#111827");
      sky.addColorStop(1, "#050716");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h);
      ctx.lineTo(w * 0.43, 0);
      ctx.lineTo(w * 0.57, 0);
      ctx.lineTo(w * 0.8, h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 3;
      for (let i = 1; i < 3; i++) {
        const x = w * (0.2 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(w / 2 + (i - 1.5) * 40, 0);
        ctx.stroke();
      }

      const laneX = [w * 0.35, w * 0.5, w * 0.65];
      const playerX = laneX[lane.current];

      obstacles.current.forEach((o) => (o.y += 8));
      coins.current.forEach((c) => (c.y += 8));

      obstacles.current.forEach((o) => {
        const x = laneX[o.lane];
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(x - 35, o.y, 70, 55);
        ctx.fillStyle = "#991b1b";
        ctx.fillRect(x - 25, o.y + 12, 50, 30);

        if (o.lane === lane.current && o.y > h - 160 && o.y < h - 70) dead.current = true;
      });

      coins.current.forEach((c) => {
        const x = laneX[c.lane];
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(x, c.y, 18, 0, Math.PI * 2);
        ctx.fill();

        if (c.lane === lane.current && c.y > h - 155 && c.y < h - 85) {
          c.y = 9999;
          setScore((s) => s + 10);
        }
      });

      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(playerX, h - 95, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(playerX - 18, h - 70, 36, 55);

      setScore((s) => s + 1);
      obstacles.current = obstacles.current.filter((o) => o.y < h + 100);
      coins.current = coins.current.filter((c) => c.y < h + 100);
    }, 30);

    return () => {
      window.removeEventListener("keydown", key);
      clearInterval(loop);
    };
  }, []);

  return (
    <GameShell title="🏃 Niu Runner" score={score} restart={restart}>
      <canvas ref={canvasRef} width={800} height={520} className="w-full rounded-3xl bg-black" />
      <p className="mt-3 text-gray-300">Use ← and → arrows to switch lanes.</p>
    </GameShell>
  );
}

function SlopeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const x = useRef(400);
  const vx = useRef(0);
  const blocks = useRef<any[]>([]);
  const frame = useRef(0);
  const dead = useRef(false);
  const [score, setScore] = useState(0);

  function restart() {
    x.current = 400;
    vx.current = 0;
    blocks.current = [];
    frame.current = 0;
    dead.current = false;
    setScore(0);
  }

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") vx.current = -7;
      if (e.key === "ArrowRight") vx.current = 7;
    }

    function stop(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") vx.current = 0;
    }

    window.addEventListener("keydown", key);
    window.addEventListener("keyup", stop);

    const loop = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas || dead.current) return;
      const ctx = canvas.getContext("2d")!;
      const w = canvas.width;
      const h = canvas.height;

      frame.current++;
      x.current += vx.current;
      x.current = Math.max(80, Math.min(w - 80, x.current));

      if (frame.current % 45 === 0) {
        blocks.current.push({ x: Math.random() * (w - 160) + 80, y: -70, size: 70 });
      }

      ctx.fillStyle = "#050716";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 40 + (frame.current * 6) % 40);
        ctx.lineTo(w, i * 40 + (frame.current * 6) % 40);
        ctx.stroke();
      }

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.moveTo(120, h);
      ctx.lineTo(330, 0);
      ctx.lineTo(470, 0);
      ctx.lineTo(680, h);
      ctx.closePath();
      ctx.fill();

      blocks.current.forEach((b) => (b.y += 9));
      blocks.current.forEach((b) => {
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(b.x, b.y, b.size, b.size);

        if (Math.abs(x.current - (b.x + b.size / 2)) < 55 && Math.abs(h - 90 - (b.y + b.size / 2)) < 55) {
          dead.current = true;
        }
      });

      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(x.current, h - 90, 32, 0, Math.PI * 2);
      ctx.fill();

      setScore((s) => s + 1);
      blocks.current = blocks.current.filter((b) => b.y < h + 100);
    }, 30);

    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", stop);
      clearInterval(loop);
    };
  }, []);

  return (
    <GameShell title="🟣 Neon Slope" score={score} restart={restart}>
      <canvas ref={canvasRef} width={800} height={520} className="w-full rounded-3xl bg-black" />
      <p className="mt-3 text-gray-300">Use ← and → arrows. Dodge red blocks.</p>
    </GameShell>
  );
}

function HoopsGame() {
  const [power, setPower] = useState(0);
  const [dir, setDir] = useState(1);
  const [score, setScore] = useState(0);
  const [shot, setShot] = useState("Tap shoot when the bar is in the green zone.");

  useEffect(() => {
    const loop = setInterval(() => {
      setPower((p) => {
        let next = p + dir * 4;
        if (next >= 100) {
          setDir(-1);
          next = 100;
        }
        if (next <= 0) {
          setDir(1);
          next = 0;
        }
        return next;
      });
    }, 40);

    return () => clearInterval(loop);
  }, [dir]);

  function shoot() {
    if (power > 42 && power < 58) {
      setScore((s) => s + 3);
      setShot("SWISH 🔥 +3");
    } else if (power > 32 && power < 68) {
      setScore((s) => s + 1);
      setShot("Rim bounce 😅 +1");
    } else {
      setShot("Brick 💀 Try again");
    }
  }

  return (
    <GameShell title="🏀 Niu Hoops" score={score} restart={() => setScore(0)}>
      <div className="rounded-3xl bg-gradient-to-b from-orange-400 to-orange-900 p-8 text-center min-h-[520px]">
        <div className="mx-auto mb-8 h-32 w-44 rounded-b-full border-[14px] border-white border-t-0" />
        <div className="mx-auto mb-8 h-32 w-32 rounded-full bg-orange-500 border-8 border-black shadow-2xl" />

        <p className="mb-4 text-2xl font-black">{shot}</p>

        <div className="mx-auto mb-5 h-8 max-w-xl rounded-full bg-black/40 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-red-500 via-green-400 to-red-500" style={{ width: `${power}%` }} />
        </div>

        <button onClick={shoot} className="rounded-2xl bg-cyan-300 px-10 py-4 text-2xl font-black text-black">
          Shoot
        </button>
      </div>
    </GameShell>
  );
}

function GameShell({
  title,
  score,
  restart,
  children,
}: {
  title: string;
  score: number;
  restart: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black">{title}</h2>
          <p className="text-cyan-300 font-bold">Score: {score}</p>
        </div>
        <button onClick={restart} className="rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">
          Restart
        </button>
      </div>
      {children}
    </section>
  );
}