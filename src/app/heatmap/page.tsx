"use client"

import Navbar from "@/components/navbar"

export default function HeatmapPage() {

  const files = [
    { name: "auth.js", risk: "High" },
    { name: "login.js", risk: "Medium" },
    { name: "config.js", risk: "Low" }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar showTutorButton={false} />
      <main className="flex-1 p-10 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-10 text-slate-900 dark:text-white">
          File Risk Heatmap
        </h1>

        <div className="space-y-4">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 shadow-sm"
            >
              <span className="font-mono text-sm">{f.name}</span>
              <span className={`font-mono text-sm font-bold ${
                f.risk === "High"
                  ? "text-red-500"
                  : f.risk === "Medium"
                  ? "text-yellow-500"
                  : "text-green-500"
              }`}>
                {f.risk}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
