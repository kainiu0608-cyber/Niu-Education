"use client";

import { useState } from "react";

export default function FlashcardsPage() {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [cards, setCards] = useState<{ front: string; back: string }[]>([]);
  const [flipped, setFlipped] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[#050716] text-white p-6">
      <a href="/" className="text-cyan-300 font-bold">← Back</a>
      <h1 className="text-5xl font-black mt-6 mb-6">Flashcards</h1>

      <div className="grid gap-3 md:grid-cols-2 mb-6">
        <input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front" className="rounded-2xl bg-white/10 p-4 outline-none" />
        <input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back" className="rounded-2xl bg-white/10 p-4 outline-none" />
      </div>

      <button
        onClick={() => {
          if (!front || !back) return;
          setCards([{ front, back }, ...cards]);
          setFront("");
          setBack("");
        }}
        className="rounded-2xl bg-cyan-300 px-6 py-3 font-black text-black"
      >
        Add Card
      </button>

      <div className="grid gap-4 md:grid-cols-3 mt-8">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => setFlipped(flipped === i ? null : i)}
            className="min-h-40 rounded-3xl bg-white/10 p-6 text-2xl font-black"
          >
            {flipped === i ? card.back : card.front}
          </button>
        ))}
      </div>
    </main>
  );
}