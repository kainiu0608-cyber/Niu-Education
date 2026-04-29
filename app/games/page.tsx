"use client";

export default function GamesPage() {
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-4xl font-black mb-6">🎮 Niu Games</h1>

      <div className="grid md:grid-cols-2 gap-6">

        {/* GAME 1 */}
        <div className="bg-white/10 rounded-3xl p-4">
          <h2 className="font-bold mb-2">Subway Surfers</h2>
          <iframe
            src="https://games.crazygames.com/en_US/subway-surfers/index.html"
            className="w-full h-[400px] rounded-xl"
            allowFullScreen
          />
        </div>

        {/* GAME 2 */}
        <div className="bg-white/10 rounded-3xl p-4">
          <h2 className="font-bold mb-2">Slope</h2>
          <iframe
            src="https://games.crazygames.com/en_US/slope/index.html"
            className="w-full h-[400px] rounded-xl"
            allowFullScreen
          />
        </div>

        {/* GAME 3 */}
        <div className="bg-white/10 rounded-3xl p-4">
          <h2 className="font-bold mb-2">Basketball Stars</h2>
          <iframe
            src="https://games.crazygames.com/en_US/basketball-stars/index.html"
            className="w-full h-[400px] rounded-xl"
            allowFullScreen
          />
        </div>

      </div>
    </main>
  );
}