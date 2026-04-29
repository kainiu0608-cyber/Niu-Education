"use client";

import { useState } from "react";

export default function EssayPage() {
  const [topic, setTopic] = useState("");
  const [thesis, setThesis] = useState("");

  return (
    <main className="min-h-screen bg-[#050716] text-white p-6">
      <a href="/" className="text-cyan-300 font-bold">← Back</a>
      <h1 className="text-5xl font-black mt-6 mb-6">Essay Lab</h1>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Essay topic"
        className="w-full rounded-2xl bg-white/10 p-4 outline-none mb-4"
      />

      <textarea
        value={thesis}
        onChange={(e) => setThesis(e.target.value)}
        placeholder="Thesis / main idea"
        className="w-full min-h-32 rounded-2xl bg-white/10 p-4 outline-none mb-6"
      />

      <div className="rounded-3xl bg-white/10 p-6">
        <h2 className="text-3xl font-black mb-4">Essay Outline</h2>
        <p><b>Topic:</b> {topic || "Your topic here"}</p>
        <p><b>Thesis:</b> {thesis || "Your thesis here"}</p>

        <ol className="list-decimal pl-6 mt-4 space-y-2">
          <li>Introduction with hook and thesis</li>
          <li>Body paragraph 1 with evidence</li>
          <li>Body paragraph 2 with evidence</li>
          <li>Body paragraph 3 with evidence</li>
          <li>Conclusion that restates main idea</li>
        </ol>
      </div>
    </main>
  );
}