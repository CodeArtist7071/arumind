import React from "react";

const Leaderboard = () => {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-on-surface dark:text-slate-100 min-h-screen">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 dark:bg-background-dark/80 backdrop-blur-md  dark:border-slate-800 px-4 md:px-10 lg:px-20 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-2 rounded-lg">
              <span className="material-symbols-outlined">school</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold">Odisha Exam Prep</h2>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-6 text-sm font-semibold">
            <a href="#" className="hover:text-primary">Courses</a>
            <a href="#" className="hover:text-primary">Mock Tests</a>
            <a href="#" className="text-primary border-b-2 border-primary pb-1">Leaderboard</a>
            <a href="#" className="hover:text-primary">Analysis</a>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block relative">
              <input
                type="text"
                placeholder="Search exams..."
                className="bg-surface-container-high dark:bg-slate-800 rounded-lg px-4 py-2 text-sm w-40 md:w-64 focus:ring-2 focus:ring-primary"
              />
            </div>
            <button className="bg-primary/10 text-primary p-2 rounded-full">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 md:px-10 lg:px-20 py-8">

        {/* Hero */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold mb-4">
              <span className="material-symbols-outlined text-sm">workspace_premium</span>
              Top Performers
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-2">Hall of Fame</h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl text-sm md:text-base">
              Compete with aspirants across Odisha and track your progress daily.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="bg-surface dark:bg-slate-800 p-1 rounded-xl border flex">
              <button className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg">
                Global
              </button>
              <button className="px-4 py-2 text-sm font-bold text-on-surface-variant">
                Odisha Only
              </button>
            </div>

            <div className="bg-surface dark:bg-slate-800 p-1 rounded-xl border flex">
              <button className="px-4 py-2 text-sm font-bold text-on-surface-variant">
                Daily
              </button>
              <button className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg">
                Weekly
              </button>
              <button className="px-4 py-2 text-sm font-bold text-on-surface-variant">
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">

            {/* Podium */}
            <div className="grid grid-cols-3 items-end gap-2 md:gap-6 bg-surface dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow border">

              {/* Rank 2 */}
              <div className="flex flex-col items-center gap-3">
                <img
                  src="https://via.placeholder.com/150"
                  alt="rank2"
                  className="h-16 w-16 md:h-24 md:w-24 rounded-full border-4 border-slate-300"
                />
                <p className="font-bold text-sm md:text-base text-center">Priyanka Das</p>
                <p className="text-xs text-primary font-semibold">1,840 pts</p>
              </div>

              {/* Rank 1 */}
              <div className="flex flex-col items-center gap-3">
                <img
                  src="https://via.placeholder.com/150"
                  alt="rank1"
                  className="h-20 w-20 md:h-32 md:w-32 rounded-full border-4 border-yellow-400"
                />
                <p className="font-bold text-base md:text-xl text-center">Aakash Mohanty</p>
                <p className="text-sm text-primary font-bold">2,150 pts</p>
              </div>

              {/* Rank 3 */}
              <div className="flex flex-col items-center gap-3">
                <img
                  src="https://via.placeholder.com/150"
                  alt="rank3"
                  className="h-14 w-14 md:h-20 md:w-20 rounded-full border-4 border-orange-300"
                />
                <p className="font-bold text-sm md:text-base text-center">Sonal Nayak</p>
                <p className="text-xs text-primary font-semibold">1,720 pts</p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-surface dark:bg-slate-800 rounded-2xl shadow border overflow-hidden">
              <div className="p-4 border-b flex flex-col sm:flex-row justify-between gap-4">
                <h3 className="font-bold text-lg">Top Rankings</h3>
                <input
                  type="text"
                  placeholder="Search student..."
                  className="bg-surface-container-high dark:bg-slate-900 rounded-lg px-4 py-2 text-sm w-full sm:w-72"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low dark:bg-slate-900/50 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 hidden md:table-cell">Exam</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { rank: 4, name: "Amit Patnaik", score: 1695, acc: "92%" },
                      { rank: 5, name: "Ritu Tripathy", score: 1580, acc: "88%" },
                      { rank: 6, name: "Bikram Jena", score: 1450, acc: "85%" },
                    ].map((student) => (
                      <tr key={student.rank} className="border-t hover:bg-surface-container-low dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-bold">#{student.rank}</td>
                        <td className="px-4 py-3 font-semibold">{student.name}</td>
                        <td className="px-4 py-3 hidden md:table-cell">OPSC</td>
                        <td className="px-4 py-3 text-primary font-bold">{student.score}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">{student.acc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">

            {/* My Rank Card */}
            <div className="bg-primary rounded-2xl p-6 text-white shadow-lg">
              <p className="text-sm uppercase opacity-80">Your Position</p>
              <h3 className="text-3xl font-black mb-4">Rank #142</h3>
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-xs uppercase">Points</p>
                  <p className="font-bold text-lg">842</p>
                </div>
                <div>
                  <p className="text-xs uppercase">Accuracy</p>
                  <p className="font-bold text-lg">76%</p>
                </div>
              </div>
              <button className="w-full py-3 bg-surface text-primary rounded-xl font-bold text-sm">
                Improve Your Rank
              </button>
            </div>

            {/* Rewards Banner */}
            <div className="bg-gradient-to-br from-indigo-600 to-primary rounded-2xl p-6 text-white">
              <h4 className="font-black text-xl mb-2">Unlock Premium Rewards</h4>
              <p className="text-sm mb-4">
                Top 10 finishers this month get a free toolkit!
              </p>
              <button className="bg-surface/20 px-4 py-2 rounded-lg text-sm font-bold">
                Learn more
              </button>
            </div>
          </div>
        </div>

        {/* Quote */}
        <div className="mt-12 text-center max-w-2xl mx-auto border-t pt-8">
          <p className="text-lg italic text-on-surface-variant dark:text-slate-400">
            "Success is not final, failure is not fatal."
          </p>
          <p className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
            Keep Pushing
          </p>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
