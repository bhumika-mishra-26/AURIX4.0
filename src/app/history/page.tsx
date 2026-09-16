"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { History, Calendar, Shield, ChevronRight, Activity, ArrowLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import Navbar from "@/components/navbar"
import { apiClient } from "@/lib/api"
import { supabase } from "@/services/supabaseClient"

interface ScanHistoryItem {
  id: string
  status: string
  progress: number
  total_findings: number | null
  neutralized_count: number | null
  created_at: string
  updated_at: string
  project_id: string
  repo_name?: string
  repository_url?: string
}

export default function HistoryPage() {
  const router = useRouter()

  const [historyItems, setHistoryItems] = useState<ScanHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScans = async () => {
    setIsLoading(true)
    setError(null)
    try {
      let rawScans: any[] = []

      // 1. Try backend API scan list first
      const apiRes = await apiClient("/api/scans").catch(() => null)
      if (Array.isArray(apiRes) && apiRes.length > 0) {
        rawScans.push(...apiRes)
      }

      // 2. Query Supabase scans table
      const { data: dbScans } = await supabase
        .from("scans")
        .select("id, status, progress, current_step, total_findings, neutralized_count, created_at, updated_at, project_id")
        .order("created_at", { ascending: false })
        .limit(50)

      if (Array.isArray(dbScans) && dbScans.length > 0) {
        dbScans.forEach((s: any) => {
          if (!rawScans.some((existing: any) => existing.id === s.id)) {
            rawScans.push(s)
          }
        })
      }

      // 3. Query verified_vulnerabilities table to discover all scan sessions
      const { data: dbVulns } = await supabase
        .from("verified_vulnerabilities")
        .select("scan_id, created_at, title, file_path, severity, tool")
        .order("created_at", { ascending: false })
        .limit(500)

      if (Array.isArray(dbVulns) && dbVulns.length > 0) {
        const vulnScansMap: Record<string, { id: string; status: string; progress: number; total_findings: number; created_at: string; sample_file: string }> = {}

        dbVulns.forEach((v: any) => {
          if (!v.scan_id) return
          if (!vulnScansMap[v.scan_id]) {
            vulnScansMap[v.scan_id] = {
              id: v.scan_id,
              status: "COMPLETED",
              progress: 100,
              total_findings: 0,
              created_at: v.created_at || new Date().toISOString(),
              sample_file: v.file_path || ""
            }
          }
          vulnScansMap[v.scan_id].total_findings += 1
        })

        Object.values(vulnScansMap).forEach((vScan) => {
          const existingIdx = rawScans.findIndex((s: any) => s.id === vScan.id)
          if (existingIdx >= 0) {
            if (rawScans[existingIdx].total_findings === null || rawScans[existingIdx].total_findings === 0) {
              rawScans[existingIdx].total_findings = vScan.total_findings
            }
          } else {
            rawScans.push(vScan)
          }
        })
      }

      // Fetch project metadata (name & repo URL) for project IDs
      const projectIds = Array.from(new Set(rawScans.map((s: any) => s.project_id).filter(Boolean)))
      let projectMap: Record<string, { name: string; url: string }> = {}

      if (projectIds.length > 0) {
        try {
          const { data: projData } = await supabase
            .from("projects")
            .select("id, name, repository_url")
            .in("id", projectIds)
          if (Array.isArray(projData)) {
            projData.forEach((p: any) => {
              projectMap[p.id] = {
                name: p.name || "",
                url: p.repository_url || ""
              }
            })
          }
        } catch (e) {
          console.warn("Project metadata notice:", e)
        }
      }

      if (rawScans.length > 0) {
        rawScans.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

        const formatted: ScanHistoryItem[] = rawScans.map((item: any) => {
          const projMeta = projectMap[item.project_id] || {}
          return {
            id: item.id,
            status: item.status || "COMPLETED",
            progress: item.progress ?? 100,
            total_findings: item.total_findings ?? null,
            neutralized_count: item.neutralized_count ?? null,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || item.created_at || new Date().toISOString(),
            project_id: item.project_id || "",
            repo_name: projMeta.name || item.repo_name || item.sample_file || "",
            repository_url: projMeta.url || item.repository_url || ""
          }
        })
        setHistoryItems(formatted)
      } else {
        setHistoryItems([])
      }
    } catch (err: any) {
      console.warn("Error fetching scan history:", err)
      setError(err?.message || "Failed to load scan history")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchScans()
  }, [])

  /** Format the date string nicely */
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    } catch {
      return iso
    }
  }

  /** Derive a risk score color from total findings count */
  const getRiskColor = (findings: number | null) => {
    const n = findings ?? 0
    if (n >= 5) return "text-red-500"
    if (n >= 2) return "text-yellow-500"
    return "text-green-500"
  }

  /** Status badge color */
  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase()
    if (s === "COMPLETED") return "text-green-500"
    if (s === "FAILED") return "text-red-400"
    if (s === "SCANNING" || s === "PENDING") return "text-orange-400"
    return "text-slate-400"
  }

  /** Derive a display label from status */
  const getStatusLabel = (status: string) => {
    const s = status?.toUpperCase()
    if (s === "COMPLETED") return "Completed"
    if (s === "FAILED") return "Failed"
    if (s === "SCANNING") return "Scanning…"
    if (s === "PENDING") return "Pending"
    return status
  }

  /** Derive a short readable name for the scan */
  const getScanLabel = (item: ScanHistoryItem) => {
    if (item.repository_url) {
      // e.g. https://github.com/org/repo → org/repo
      return item.repository_url.replace(/^https?:\/\/(www\.)?github\.com\//, "")
    }
    if (item.repo_name) return item.repo_name
    // Fall back to short ID
    return `Scan ${item.id.substring(0, 8).toUpperCase()}`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <Navbar showTutorButton={false} />

      <main className="flex-1 p-6 md:p-12 relative overflow-hidden">
        {/* Decorative ambient glows */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] rounded-full bg-orange-500/5 blur-[100px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">

          {/* Navigation back */}
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white font-mono transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>

          {/* Header */}
          <div className="border-b border-slate-900 pb-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <History className="text-orange-500" size={24} />
                <h1 className="text-2xl font-bold tracking-tight text-white">Scan Session History</h1>
              </div>
              <p className="text-sm text-slate-400">
                Review and browse historical vulnerability wargaming assessment sessions.
              </p>
            </div>
            <button
              onClick={fetchScans}
              disabled={isLoading}
              title="Refresh"
              className="p-2 border border-slate-800 bg-slate-900 rounded-xl text-slate-400 hover:text-white hover:border-orange-500/40 transition shrink-0 cursor-pointer disabled:opacity-40"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500 font-mono">
              <Loader2 size={32} className="animate-spin text-orange-500" />
              <span className="text-sm">Loading scan history…</span>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchScans}
                className="px-4 py-2 bg-orange-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-orange-400 transition cursor-pointer font-mono"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && historyItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
              <History size={36} className="text-slate-700" />
              <p className="text-sm font-mono">No scans found. Run your first scan to see history here.</p>
              <button
                onClick={() => router.push("/scan")}
                className="mt-2 px-5 py-2 bg-orange-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-orange-400 transition cursor-pointer font-mono"
              >
                Launch Scan
              </button>
            </div>
          )}

          {/* Scan list */}
          {!isLoading && !error && historyItems.length > 0 && (
            <div className="space-y-4">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/dashboard?scan_id=${item.id}`)}
                  className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-orange-500/30 hover:shadow-lg hover:shadow-black/20 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition duration-200 group"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-white font-mono truncate max-w-md group-hover:text-orange-400 transition">
                        {getScanLabel(item)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                        scan id: {item.id.substring(0, 8)}…
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-500" />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Shield size={12} className="text-slate-500" />
                        <span>{item.total_findings ?? "—"} findings</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity size={12} className="text-slate-500" />
                        <span className={getStatusColor(item.status)}>{getStatusLabel(item.status)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Risk metrics and action */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t border-slate-800 sm:border-0 pt-3 sm:pt-0 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block font-mono uppercase">Findings</span>
                      <span className={`text-xl font-bold font-mono ${getRiskColor(item.total_findings)}`}>
                        {item.total_findings ?? "—"}
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-slate-600 hidden sm:block group-hover:text-orange-500 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
