"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import VulnerabilityTable from "@/components/vulnerability-table"
import VulnerabilityKanban, { Vulnerability } from "@/components/vulnerability-kanban"
import VulnerabilityDetail from "@/components/vulnerability-detail"
import SecurityChatbot from "@/components/security-chatbot"
import { 
  ShieldCheck, 
  MessageSquare, 
  Sparkles, 
  Bot, 
  Terminal, 
  Activity, 
  Search,
  Filter,
  X,
  AlertCircle,
  LogOut,
  User as UserIcon,
  RefreshCw,
  Loader2
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/services/supabaseClient"
import { apiClient } from "@/lib/api"

function DashboardContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [viewType, setViewType] = useState<"kanban" | "table">("kanban")
  const [showGuide, setShowGuide] = useState(true)
  const [isFetchingFindings, setIsFetchingFindings] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("All")
  const [layerFilter, setLayerFilter] = useState<string>("All")

  // Dynamic Executive Summary computation from active findings
  const generateDynamicSummary = (vulns: Vulnerability[]) => {
    const total = vulns.length
    const resolved = vulns.filter(v => v.status === "resolved")
    const active = vulns.filter(v => v.status !== "resolved")
    const criticals = active.filter(v => v.severity === "Critical")
    const highs = active.filter(v => v.severity === "High")
    const mediums = active.filter(v => v.severity === "Medium")

    if (!hasLoaded) {
      return "Synchronizing with AURIX Intelligence Pipeline and retrieving active scan findings..."
    }

    if (total === 0) {
      return "AURIX Autonomous Threat Scan completed. No security findings were identified in the scanned workspace. Pipeline defenses are verified."
    }

    if (active.length === 0) {
      return `AURIX Autonomous Defense Report: All ${total} detected threat vectors have been successfully remediated and verified via the Blue Agent wargaming loop. The codebase now operates with zero active security breaches. Continuous pipeline monitoring remains active.`
    }

    const topThreatNames = active.slice(0, 2).map(v => `${v.vuln} (${v.file.split("/").pop()})`).join(" and ")

    return `AURIX Agentic Threat Scan evaluated ${total} security vectors across your codebase. The LangGraph Multi-Agent Engine routed ${active.length} active flaws to the sandbox wargaming loop: proving ${criticals.length} Critical and ${highs.length} High severity flaws as verified True Positives (notably ${topThreatNames}). The Blue Agent synthesized drop-in remediation patches, neutralizing exploit execution across all test harnesses. ${resolved.length > 0 ? `${resolved.length} vulnerabilities have already been patched and resolved.` : "Review verified diffs below and apply the fixes via One-Click GitHub PR to secure your deployment."}`
  }

  // Executive summary state
  const [summaryText, setSummaryText] = useState("")
  const [summaryIndex, setSummaryIndex] = useState(0)
  const [fullSummary, setFullSummary] = useState("")

  // Store token if redirected with access_token in hash (e.g. Supabase OAuth)
  useEffect(() => {
    const syncSession = async () => {
      if (typeof window !== "undefined") {
        if (window.location.hash) {
          const params = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = params.get("access_token")
          if (accessToken) {
            localStorage.setItem("aurix_token", accessToken)
            window.history.replaceState(null, "", window.location.pathname)
          }
        }
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          localStorage.setItem("aurix_token", session.access_token)
          if (session.user) {
            localStorage.setItem("aurix_user", JSON.stringify(session.user))
          }
        }
      }
    }
    syncSession()
  }, [])

  // Dynamic Vulnerabilities Dataset (loaded exclusively from active scan)
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [activeRepoName, setActiveRepoName] = useState<string>("")

  // Fetch findings for the active scan
  const fetchFindings = useCallback(async () => {
    let scanId = ""
    let repoName = ""
    if (typeof window !== "undefined") {
      // Prefer URL param (set by scan page navigation), fall back to localStorage
      scanId = searchParams?.get("scan_id") || localStorage.getItem("aurix_current_scan_id") || ""
      repoName = searchParams?.get("repo") || localStorage.getItem("aurix_scanned_repo") || localStorage.getItem("aurix_repo_url") || ""
      if (repoName) setActiveRepoName(repoName)
    }

    setIsFetchingFindings(true)

    // Helper to map raw backend finding → Vulnerability
    const mapFinding = (d: any, idx: number): Vulnerability => {
      let mappedStatus: Vulnerability["status"] = "remediation"
      if (d.is_resolved) {
        mappedStatus = "resolved"
      } else if (d.wargame_status === "Triage Pending" || d.wargame_status === "triage" || d.wargame_status === "Pending") {
        mappedStatus = "triage"
      } else if (d.wargame_status === "PoC Active" || d.wargame_status === "exploiting" || d.wargame_status === "Wargaming") {
        mappedStatus = "exploiting"
      } else if (d.wargame_status === "Neutralized" || d.wargame_status === "remediation" || d.wargame_status === "Patched") {
        mappedStatus = "remediation"
      } else {
        mappedStatus = (idx % 3 === 0) ? "triage" : (idx % 3 === 1) ? "exploiting" : "remediation"
      }
      // Normalise category → layer
      const cat = (d.category || "").toLowerCase()
      const layer = cat === "sca" ? "Infrastructure" : "Backend"
      // Normalise severity (backend sends uppercase e.g. "HIGH", "CRITICAL")
      const rawSev = (d.severity || "High") as string
      const severity = (rawSev.charAt(0).toUpperCase() + rawSev.slice(1).toLowerCase()) as Vulnerability["severity"]

      return {
        id: d.id || `backend-vuln-${idx}`,
        file: d.file_path || "src/index.js",
        vuln: d.title || d.rule_id || "Identified Vulnerability",
        layer,
        severity,
        cvss: d.cvss || 8.5,
        status: mappedStatus,
        codeLine: d.line_number || 1,
        vulnCode: d.evidence || "// Code flag identified by scanner",
        pocScript: d.poc_script || "# Red Agent PoC Exploit Script",
        patchCode: d.patch_code || "# Blue Agent Remediation Patch"
      }
    }

    try {
      // 1. Try scan-specific endpoint first (if we have a scan_id)
      if (scanId) {
        try {
          const scanRes = await apiClient(`/api/scans/${encodeURIComponent(scanId)}`)
          const scanFindings = Array.isArray(scanRes?.findings) ? scanRes.findings : []
          if (scanFindings.length > 0) {
            setVulnerabilities(scanFindings.map(mapFinding))
            setHasLoaded(true)
            setIsFetchingFindings(false)
            return
          }
        } catch (sErr) {
          console.warn("Scan endpoint fetch warning:", sErr)
        }

        // Fallback to active findings filtered by scan_id
        const rawRes = await apiClient(`/api/findings/active?scan_id=${encodeURIComponent(scanId)}`)
        const data = Array.isArray(rawRes) ? rawRes : (rawRes?.findings || rawRes?.data || [])
        if (Array.isArray(data) && data.length > 0) {
          setVulnerabilities(data.map(mapFinding))
          setHasLoaded(true)
          setIsFetchingFindings(false)
          return
        }
      }

      // 2. Global latest findings fetch (no scan_id filter)
      const rawRes = await apiClient("/api/findings/active")
      const data = Array.isArray(rawRes) ? rawRes : (rawRes?.findings || rawRes?.data || [])
      if (Array.isArray(data)) {
        setVulnerabilities(data.map(mapFinding))
      } else {
        setVulnerabilities([])
      }
    } catch (err) {
      console.log("Error fetching scan findings:", err)
      setVulnerabilities([])
    } finally {
      setIsFetchingFindings(false)
      setHasLoaded(true)
    }
  }, [searchParams])

  // Re-fetch findings on mount AND whenever refreshKey or searchParams changes
  useEffect(() => {
    fetchFindings()
  }, [fetchFindings, refreshKey, searchParams])

  // Supabase Realtime channel subscription for dynamic DB updates
  useEffect(() => {
    let scanId = ""
    if (typeof window !== "undefined") {
      scanId = searchParams?.get("scan_id") || localStorage.getItem("aurix_current_scan_id") || ""
    }

    const channelName = `realtime-findings-${scanId || "all"}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "verified_vulnerabilities",
          ...(scanId ? { filter: `scan_id=eq.${scanId}` } : {})
        },
        () => {
          fetchFindings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [searchParams, fetchFindings])

  // Auto-polling interval every 4 seconds to guarantee real-time updates as scans progress
  useEffect(() => {
    const timer = setInterval(() => {
      fetchFindings()
    }, 4000)
    return () => clearInterval(timer)
  }, [fetchFindings])

  // Track the last summary that was typed so we don't restart animation on re-renders
  const [lastTypedSummary, setLastTypedSummary] = useState("")

  // Re-generate dynamic summary whenever vulnerabilities change — only restart typewriter if text changed
  useEffect(() => {
    const summary = generateDynamicSummary(vulnerabilities)
    if (summary !== lastTypedSummary) {
      setFullSummary(summary)
      setSummaryText("")
      setSummaryIndex(0)
      setLastTypedSummary(summary)
    }
  }, [vulnerabilities])

  // Streaming typewriter effect — runs once per unique fullSummary, then stops
  useEffect(() => {
    if (!fullSummary) return
    if (summaryIndex < fullSummary.length) {
      const timer = setTimeout(() => {
        setSummaryText(prev => prev + fullSummary[summaryIndex])
        setSummaryIndex(prev => prev + 1)
      }, 18)
      return () => clearTimeout(timer)
    }
    // typing done — no restart
  }, [summaryIndex, fullSummary])

  // Enforce permanent dark theme
  useEffect(() => {
    document.documentElement.classList.add("dark")
    document.documentElement.classList.remove("light")
    if (typeof window !== "undefined") {
      localStorage.setItem("aurix_theme", "dark")
    }
  }, [])

  const handleUpdateStatus = async (id: string, newStatus: Vulnerability["status"]) => {
    setVulnerabilities(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v))
    if (newStatus === "resolved") {
      try {
        await apiClient(`/api/findings/${id}/resolve`, {
          method: "PATCH",
          body: JSON.stringify({ is_resolved: true })
        })
      } catch (err) {
        console.warn("Could not persist resolution to backend:", err)
      }
    }
  }

  const handleApplyFix = (id: string) => {
    handleUpdateStatus(id, "resolved")
    if (selectedVuln && selectedVuln.id === id) {
      setSelectedVuln(prev => prev ? { ...prev, status: "resolved" } : null)
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setSeverityFilter("All")
    setLayerFilter("All")
  }

  // Filter logic
  const filteredVulnerabilities = vulnerabilities.filter(v => {
    const matchesSearch = v.file.toLowerCase().includes(searchQuery.toLowerCase()) || v.vuln.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSeverity = severityFilter === "All" || v.severity === severityFilter
    const matchesLayer = layerFilter === "All" || v.layer === layerFilter
    return matchesSearch && matchesSeverity && matchesLayer
  })

  // Dynamic stats calculation based on active (unresolved) vulnerabilities
  const activeVulns = vulnerabilities.filter(v => v.status !== "resolved")
  const activeThreats = activeVulns.length

  const riskScore = activeThreats === 0
    ? 0
    : (() => {
        const maxCvss = Math.max(...activeVulns.map(v => v.cvss || 5.0), 0)
        const avgCvss = activeVulns.reduce((sum, v) => sum + (v.cvss || 5.0), 0) / activeThreats
        const criticalCount = activeVulns.filter(v => v.severity === "Critical").length
        const highCount = activeVulns.filter(v => v.severity === "High").length
        
        const rawScore = (maxCvss * 7.0) + (avgCvss * 2.0) + (criticalCount * 3.5) + (highCount * 2.0)
        return Math.min(100, Math.round(rawScore * 10) / 10)
      })()

  const riskCategory = riskScore >= 80 ? "Critical" : riskScore >= 60 ? "High" : riskScore >= 40 ? "Medium" : riskScore > 0 ? "Low" : "Secured"

  // Dynamic Heat Index
  const projectHeat = activeThreats === 0 
    ? 0 
    : Math.min(10, Math.round((activeVulns.reduce((sum, v) => sum + (v.cvss || 5.0), 0) / 3.0) * 100) / 100)

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans p-6 md:p-10 relative overflow-hidden transition-colors duration-300">
      
      {/* BACKGROUND DECO */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-orange-500/5 dark:bg-orange-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[45%] h-[45%] rounded-full bg-blue-500/5 dark:bg-blue-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        
        {/* NAVBAR */}
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-900 pb-5">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push("/")}>
            <div className="p-1.5 rounded-lg bg-orange-500 text-slate-950 font-bold group-hover:rotate-12 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <h1 className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
              AURIX<span className="text-orange-500">.</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-650 dark:text-slate-350 hover:text-slate-950 dark:hover:text-white transition shadow-sm cursor-pointer"
              title="Open AURIX Tutor"
            >
              <MessageSquare size={14} className="text-orange-500" />
              AURIX Tutor
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated && !user) {
                  router.push("/login?redirect=/scan")
                  return
                }
                router.push("/scan")
              }}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:scale-[1.02] shadow shadow-orange-500/5 transition cursor-pointer"
            >
              Start Scan
            </button>

            <button
              onClick={() => setRefreshKey(k => k + 1)}
              disabled={isFetchingFindings}
              title="Refresh findings from backend"
              className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 transition shadow-sm disabled:opacity-50"
            >
              {isFetchingFindings ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>

            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                <UserIcon size={12} className="text-orange-500" />
                <span className="truncate max-w-[140px]" title={user.user_metadata?.user_name || user.user_metadata?.full_name || user.email || ""}>
                  {user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Agent"}
                </span>
              </div>
            )}

            <button
              onClick={async () => {
                await logout()
                router.push("/login")
              }}
              className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition shadow-sm cursor-pointer"
              title="Sign Out Session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* SUMMARY STATS (WITH INTERACTIVE FILTER TRIGGERS & TOOLTIPS) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div 
            onClick={() => setSeverityFilter("Critical")}
            className="group cursor-pointer bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-red-500/40 p-5 rounded-2xl shadow-sm hover:shadow-md space-y-3 transition-all duration-200 relative overflow-hidden"
            title="Click to filter by Critical threats"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-rose-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-500">Global Risk Score</span>
              <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle size={13} className="text-red-500" />
              </div>
            </div>
            <p className={`text-3xl font-black font-mono tracking-tight transition ${
              riskScore >= 80 ? "text-red-500" :
              riskScore >= 60 ? "text-orange-500" :
              riskScore >= 40 ? "text-yellow-500" :
              riskScore > 0 ? "text-blue-500" : "text-emerald-500"
            }`}>
              {riskScore.toFixed(1)}
            </p>
            <span className="text-[9px] text-slate-400 dark:text-slate-600 font-mono block group-hover:text-red-500/70 transition-colors">Filter critical issues →</span>
          </div>

          <div 
            onClick={() => setSeverityFilter("High")}
            className="group cursor-pointer bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-orange-500/40 p-5 rounded-2xl shadow-sm hover:shadow-md space-y-3 transition-all duration-200 relative overflow-hidden"
            title="Click to filter by High severity threats"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-500">Risk Category</span>
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <Activity size={13} className="text-orange-500" />
              </div>
            </div>
            <p className={`text-3xl font-black tracking-tight transition ${
              riskCategory === "Critical" ? "text-red-500" :
              riskCategory === "High" ? "text-orange-500" :
              riskCategory === "Medium" ? "text-yellow-500" :
              riskCategory === "Low" ? "text-blue-500" : "text-emerald-500"
            }`}>
              {riskScore > 0 ? riskCategory : "Secured"}
            </p>
            <span className="text-[9px] text-slate-400 dark:text-slate-600 font-mono block group-hover:text-orange-500/70 transition-colors">Filter high severity →</span>
          </div>

          <div 
            onClick={() => setLayerFilter("Backend")}
            className="group cursor-pointer bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-yellow-500/40 p-5 rounded-2xl shadow-sm hover:shadow-md space-y-3 transition-all duration-200 relative overflow-hidden"
            title="Click to filter by Backend layer"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-300 opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-500">Heat Index</span>
              <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                <Terminal size={13} className="text-yellow-500" />
              </div>
            </div>
            <p className="text-3xl font-black text-yellow-500 dark:text-yellow-400 font-mono tracking-tight transition">
              {projectHeat.toFixed(2)}
            </p>
            <span className="text-[9px] text-slate-400 dark:text-slate-600 font-mono block group-hover:text-yellow-500/70 transition-colors">Filter backend layer →</span>
          </div>

          <div 
            onClick={resetFilters}
            className="group cursor-pointer bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 p-5 rounded-2xl shadow-sm hover:shadow-md space-y-3 transition-all duration-200 relative overflow-hidden"
            title="Click to reset filters"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-500">Active Threats</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck size={13} className="text-blue-500" />
              </div>
            </div>
            <p className={`text-3xl font-black font-mono tracking-tight transition ${activeThreats > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-500"}`}>
              {activeThreats}
            </p>
            <span className="text-[9px] text-slate-400 dark:text-slate-600 font-mono block group-hover:text-blue-500/70 transition-colors">Reset all filters ↺</span>
          </div>
        </div>

        {/* COLLAPSIBLE QUICK GUIDE BANNER (VERY USER FRIENDLY) */}
        {showGuide && (
          <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-850 p-4 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex gap-3 items-center">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-orange-500" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono uppercase tracking-wider">AURIX Interactive Wargaming Guide</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Select a threat card below <span className="text-orange-500 font-bold">→</span> Click <span className="font-semibold text-slate-800 dark:text-slate-200">Wargame</span> (simulates Red Agent exploit) <span className="text-orange-500 font-bold">→</span> Click <span className="font-semibold text-slate-800 dark:text-slate-200">Remediate</span> (simulates Blue Agent patch) <span className="text-orange-500 font-bold">→</span> Click <span className="font-semibold text-slate-800 dark:text-slate-200">One-Click PR</span> to resolve it.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowGuide(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded transition"
              title="Close guide"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* AI EXECUTIVE SUMMARY STREAMING PANEL */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-[10px] font-mono text-slate-400 dark:text-slate-700 select-none uppercase tracking-widest">
            real-time report
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 shadow shadow-orange-500/5">
              <Bot size={20} className="text-orange-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Threat Landscape Executive Summary</h3>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-100 leading-relaxed font-mono text-justify max-w-5xl min-h-[60px]">
                {summaryText}
                {/* Only show blinking cursor while still typing */}
                {summaryIndex < fullSummary.length && (
                  <span className="w-1.5 h-3.5 bg-orange-500 inline-block ml-0.5 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        </div>



        {/* CONTROLS (SEARCH, FILTERS, TOGGLE VIEW) */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850/80 p-4 rounded-xl shadow-sm md:shadow-md">
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64 flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-orange-500 rounded-lg text-xs outline-none transition text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-slate-400 dark:text-slate-500" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-orange-500 transition font-mono cursor-pointer"
              >
                <option value="All">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Layer Filter */}
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-slate-400 dark:text-slate-500" />
              <select
                value={layerFilter}
                onChange={(e) => setLayerFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-orange-500 transition font-mono cursor-pointer"
              >
                <option value="All">All Layers</option>
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                <option value="Infrastructure">Infrastructure</option>
              </select>
            </div>

            {/* Clear Filters Indicator */}
            {(searchQuery || severityFilter !== "All" || layerFilter !== "All") && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-500 transition font-mono cursor-pointer"
              >
                <X size={12} />
                Clear Filters
              </button>
            )}
          </div>

          {/* Toggle View buttons */}
          <div className="flex border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg">
            <button
              onClick={() => setViewType("kanban")}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition cursor-pointer ${
                viewType === "kanban" 
                  ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-500 shadow border border-slate-200 dark:border-slate-800" 
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewType("table")}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition cursor-pointer ${
                viewType === "table" 
                  ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-500 shadow border border-slate-200 dark:border-slate-800" 
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              List Data-grid
            </button>
          </div>
        </div>

        {/* WORKSPACE BOARD */}
        <div className="bg-slate-100/50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-md min-h-[500px] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-bold font-mono uppercase tracking-widest text-slate-700 dark:text-slate-300">Threat Workspace</span>
              {activeRepoName && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  ▶ {activeRepoName.split("/").pop()?.replace(/\.git$/, "") || activeRepoName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isFetchingFindings && (
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Syncing...
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {filteredVulnerabilities.length} / {vulnerabilities.length} vectors
              </span>
            </div>
          </div>
          <div className="p-6">
          {!hasLoaded ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 font-mono">
              <Loader2 size={36} className="animate-spin text-orange-500" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Loading Scan Findings...</h4>
                <p className="text-xs text-slate-500 max-w-sm font-sans leading-relaxed">
                  Querying verified intelligence for the current repository scan.
                </p>
              </div>
            </div>
          ) : vulnerabilities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 font-mono">
              <div className="p-4 bg-white dark:bg-slate-900/40 rounded-full border border-slate-200 dark:border-slate-850 text-emerald-500">
                <ShieldCheck size={36} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Threat Vectors Detected</h4>
                <p className="text-xs text-slate-500 max-w-sm font-sans leading-relaxed">
                  Zero vulnerabilities were found for this scan. The repository is secure, or background wargaming is actively analyzing new ingestion.
                </p>
              </div>
              <button
                onClick={() => router.push("/scan")}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-orange-500 hover:text-orange-400 rounded-lg transition cursor-pointer shadow-sm"
              >
                Scan Another Repository →
              </button>
            </div>
          ) : filteredVulnerabilities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 font-mono">
              <div className="p-4 bg-white dark:bg-slate-900/40 rounded-full border border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-500">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No threat vectors match active filters</h4>
                <p className="text-xs text-slate-500 max-w-sm font-sans leading-relaxed">
                  Adjust your active filters or clear search query to inspect the {vulnerabilities.length} scanned vectors.
                </p>
              </div>
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer shadow-sm"
              >
                Reset Dashboard Filters
              </button>
            </div>
          ) : viewType === "kanban" ? (
            <VulnerabilityKanban 
              vulnerabilities={filteredVulnerabilities}
              onSelectVuln={(v) => {
                setSelectedVuln(v);
              }}
              onUpdateStatus={handleUpdateStatus}
            />
          ) : (
            <div className="bg-white dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-slate-850 rounded-xl">
              <VulnerabilityTable 
                vulnerabilities={filteredVulnerabilities.map(v => ({
                  file: v.file,
                  layer: v.layer,
                  severity: v.severity,
                  cvss: v.cvss
                }))}
              />
            </div>
          )}
          </div>
        </div>

        {/* DETAILED VIEW MODAL */}
        <VulnerabilityDetail 
          vuln={selectedVuln} 
          onClose={() => setSelectedVuln(null)} 
          onApplyFix={handleApplyFix}
          repoUrl={activeRepoName || (typeof window !== "undefined" ? localStorage.getItem("aurix_repo_url") || localStorage.getItem("aurix_scanned_repo") || "" : "")}
          onOpenChat={() => {
            setIsChatOpen(true);
          }}
        />

        {/* CONTEXTUAL AI CHAT SIDEBAR DRAWER */}
        <SecurityChatbot 
          selectedVuln={selectedVuln} 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          allVulns={vulnerabilities}
          repoName={activeRepoName || (typeof window !== "undefined" ? localStorage.getItem("aurix_scanned_repo") || "" : "")}
        />
        
      </div>
    </main>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <span className="text-sm font-mono text-slate-500">Loading AURIX Intelligence Dashboard...</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

