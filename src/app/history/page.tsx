"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { History, Calendar, Shield, ChevronRight, Activity, ArrowLeft } from "lucide-react"

export default function HistoryPage() {
  const router = useRouter()
  
  const [historyItems] = useState([
    {
      id: "scan-01",
      target: "backend/src/controllers/auth.controller.js",
      date: "2026-08-22 20:30",
      score: 82.4,
      vulnerabilitiesCount: 3,
      status: "Completed"
    },
    {
      id: "scan-02",
      target: "frontend/src/app/dashboard/page.tsx",
      date: "2026-08-21 14:15",
      score: 34.0,
      vulnerabilitiesCount: 1,
      status: "Completed"
    },
    {
      id: "scan-03",
      target: "backend/config/aws.js",
      date: "2026-08-19 09:45",
      score: 89.2,
      vulnerabilitiesCount: 2,
      status: "Completed"
    }
  ])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12 relative overflow-hidden">
      {/* Decorative ambient glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] rounded-full bg-orange-500/5 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        
        {/* Navigation back */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white font-mono transition"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="border-b border-slate-900 pb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <History className="text-orange-500" size={24} />
            <h1 className="text-2xl font-bold tracking-tight text-white">Scan Session History</h1>
          </div>
          <p className="text-sm text-slate-400">
            Review and browse historical vulnerability wargaming assessment sessions.
          </p>
        </div>

        {/* History List */}
        <div className="space-y-4">
          {historyItems.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push("/dashboard")}
              className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-750 hover:shadow-lg hover:shadow-black/20 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition duration-200"
            >
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-white font-mono truncate max-w-md">
                    {item.target}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    scan id: {item.id}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-450">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-slate-500" />
                    <span>{item.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} className="text-slate-500" />
                    <span>{item.vulnerabilitiesCount} findings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity size={12} className="text-slate-500" />
                    <span className="text-green-500">{item.status}</span>
                  </div>
                </div>
              </div>

              {/* Risk metrics and action */}
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t border-slate-850 sm:border-0 pt-3 sm:pt-0">
                <div className="text-right">
                  <span className="text-xs text-slate-500 block font-mono uppercase">Risk Score</span>
                  <span className={`text-xl font-bold font-mono ${item.score >= 80 ? "text-red-500" : "text-yellow-500"}`}>
                    {item.score.toFixed(1)}
                  </span>
                </div>
                <ChevronRight size={18} className="text-slate-600 hidden sm:block" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
