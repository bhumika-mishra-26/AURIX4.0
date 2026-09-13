"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/api"
import { ShieldCheck, AlertCircle, ArrowLeft, Loader2, ExternalLink, RefreshCw } from "lucide-react"

interface ResultFinding {
  id: string
  file: string
  vuln: string
  layer: string
  severity: "Critical" | "High" | "Medium" | "Low"
  cvss: number
  status: string
  codeLine: number
}

function ResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [findings, setFindings] = useState<ResultFinding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [scanId, setScanId] = useState<string>("")
  const [repoName, setRepoName] = useState<string>("")

  const loadScanData = async () => {
    let currentScanId = ""
    let currentRepo = ""

    if (typeof window !== "undefined") {
      currentScanId = searchParams?.get("scan_id") || localStorage.getItem("aurix_current_scan_id") || ""
      currentRepo = searchParams?.get("repo") || localStorage.getItem("aurix_scanned_repo") || localStorage.getItem("aurix_repo_url") || ""
      setScanId(currentScanId)
      setRepoName(currentRepo)
    }

    const endpoint = currentScanId
      ? `/api/findings/active?scan_id=${encodeURIComponent(currentScanId)}`
      : "/api/findings/active"

    setIsLoading(true)
    try {
      const rawData = await apiClient(endpoint)
      const data = Array.isArray(rawData) ? rawData : (rawData?.findings || rawData?.data || [])
      if (Array.isArray(data)) {
        const mapped: ResultFinding[] = data.map((d: any, idx: number) => ({
          id: d.id || `result-${idx}`,
          file: d.file_path || "src/index.js",
          vuln: d.title || d.rule_id || "Identified Vulnerability",
          layer: (d.category === "sast" || !d.category) ? "Backend" : d.category === "sca" ? "Infrastructure" : "Frontend",
          severity: (d.severity
            ? d.severity.charAt(0).toUpperCase() + d.severity.slice(1).toLowerCase()
            : "High") as ResultFinding["severity"],
          cvss: d.cvss || 8.0,
          status: d.is_resolved ? "resolved" : d.wargame_status || "Active",
          codeLine: d.line_number || 1
        }))
        setFindings(mapped)
      } else {
        setFindings([])
      }
    } catch (err) {
      console.error("Failed to load results:", err)
      setFindings([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadScanData()
  }, [searchParams])

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500/10 text-red-400 border-red-500/30"
      case "high":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30"
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30"
    }
  }

  const navigateDashboard = () => {
    const params = new URLSearchParams()
    if (scanId) params.set("scan_id", scanId)
    if (repoName) params.set("repo", repoName)
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <main className="min-h-screen p-6 md:p-10 bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white transition"
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Scan Findings Report
                {repoName && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {repoName}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {scanId ? `Scan ID: ${scanId}` : "Showing active pipeline intelligence"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadScanData}
              disabled={isLoading}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition text-slate-300 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin text-orange-500" : ""} />
              Refresh
            </button>

            <button
              onClick={navigateDashboard}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 hover:scale-[1.02] transition shadow-sm"
            >
              Interactive Kanban
              <ExternalLink size={13} />
            </button>
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="animate-spin text-orange-500" size={32} />
            <span className="text-xs font-mono text-slate-500">Retrieving scan results...</span>
          </div>
        ) : findings.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/30 border border-slate-800 rounded-xl space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">No Vulnerabilities Identified</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No threat vectors were detected for this scan. The repository adheres to security baselines, or scan execution is pending.
              </p>
            </div>
            <button
              onClick={() => router.push("/scan")}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition"
            >
              Launch New Scan
            </button>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/20">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <tr>
                  <th className="p-4">Vulnerability</th>
                  <th className="p-4">File Path</th>
                  <th className="p-4">Layer</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">CVSS</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {findings.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-4 font-medium text-slate-200">{v.vuln}</td>
                    <td className="p-4 font-mono text-slate-400">
                      {v.file}
                      <span className="text-slate-600 ml-1">:{v.codeLine}</span>
                    </td>
                    <td className="p-4 text-slate-400">{v.layer}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold border ${getSeverityBadge(v.severity)}`}>
                        {v.severity}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-300 font-semibold">{v.cvss.toFixed(1)}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <span className="text-xs font-mono text-slate-500">Loading Report...</span>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
