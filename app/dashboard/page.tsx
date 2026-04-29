"use client";

import { useState } from "react";

export default function DashboardPage() {
  const [goal, setGoal] = useState("");
  const [goals, setGoals] = useState<string[]>([]);

  return (
    <main className="min-h-screen bg-[#050716] text-white p-6">
      <a href="/" className="text-cyan-300 font-bold">← Back</a>
      <h1 className="text-5xl font-black mt-6 mb-6">Study Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="rounded-3xl bg-white/10 p-6">
          <p className="text-4xl font-black text-cyan-300">0</p>
          <p className="text-gray-300">Completed tasks</p>
        </div>
        <div className="rounded-3xl bg-white/10 p-6">
          <p className="text-4xl font-black text-purple-300">1</p>
          <p className="text-gray-300">Study streak</p>
        </div>
        <div className="rounded-3xl bg-white/10 p-6">
          <p className="text-4xl font-black text-orange-300">{goals.length}</p>
          <p className="text-gray-300">Goals</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Add study goal"
          className="flex-1 rounded-2xl bg-white/10 p-4 outline-none"
        />
        <button
          onClick={() => {
            if (!goal) return;
            setGoals([goal, ...goals]);
            setGoal("");
          }}
          className="rounded-2xl bg-cyan-300 px-6 font-black text-black"
        >
          Add
        </button>
      </div>

      <div className="space-y-3">
        {goals.map((g, i) => (
          <div key={i} className="rounded-2xl bg-white/10 p-4 font-bold">
            {g}
          </div>
        ))}
      </div>
    </main>
  );
}