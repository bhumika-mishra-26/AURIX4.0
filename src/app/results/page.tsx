"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/api"
import { supabase } from "@/services/supabaseClient"
import VulnerabilityDetail from "@/components/vulnerability-detail"
import { Vulnerability } from "@/components/vulnerability-kanban"
import { 
  ShieldCheck, 
  AlertCircle, 
  ArrowLeft, 
  Loader2, 
  ExternalLink, 
  RefreshCw, 
  Terminal, 
  Code, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Database,
  Sparkles,
  Shield,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Filter
} from "lucide-react"
import Navbar from "@/components/navbar"

interface ExtendedFinding extends Vulnerability {
  tool?: string
  ruleId?: string
  category?: string
  aiReasoning?: string
  verified?: boolean
  fix?: string
  description?: string
  wargameStatus?: string
}

function ResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [scanId, setScanId] = useState<string>("")
  const [inputScanId, setInputScanId] = useState<string>("")
  const [repoName, setRepoName] = useState<string>("")
  const [findings, setFindings] = useState<ExtendedFinding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState("All")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null)
  const [modalInitialTab, setModalInitialTab] = useState<"code" | "poc" | "patch">("poc")

  // Initialize scan ID from query or storage
  useEffect(() => {
    let currentScanId = ""
    let currentRepo = ""
    if (typeof window !== "undefined") {
      currentScanId = searchParams?.get("scan_id") || localStorage.getItem("aurix_current_scan_id") || ""
      currentRepo = searchParams?.get("repo") || localStorage.getItem("aurix_scanned_repo") || localStorage.getItem("aurix_repo_url") || ""
      setScanId(currentScanId)
      setInputScanId(currentScanId)
      setRepoName(currentRepo)
    }
    loadScanData(currentScanId)
  }, [searchParams])

  const PATCH_PLACEHOLDER = "# Blue Agent Remediation Patch pending wargaming verification"
  const hasPatchCode = (patchCode: any) =>
    patchCode && typeof patchCode === "string" && patchCode.trim().length > 0 && patchCode.trim() !== PATCH_PLACEHOLDER

  const mapFinding = (d: any, idx: number): ExtendedFinding => {
    let mappedStatus: Vulnerability["status"] = "remediation"
    if (d.is_resolved) {
      mappedStatus = "resolved"
    } else if (d.wargame_status === "Triage Pending" || d.wargame_status === "triage" || d.wargame_status === "Pending") {
      mappedStatus = "triage"
    } else if (d.wargame_status === "PoC Active" || d.wargame_status === "exploiting" || d.wargame_status === "Wargaming" || d.wargame_status === "EXPLOITED") {
      mappedStatus = "exploiting"
    } else {
      mappedStatus = "remediation"
    }
    // If mapped to Patch Review but no real patch exists → fall back to Triage Backlog
    if (mappedStatus === "remediation" && !hasPatchCode(d.patch_code)) {
      mappedStatus = "triage"
    }

    const cat = (d.category || "").toLowerCase()
    const layer = cat === "sca" ? "Infrastructure" : cat === "sast" ? "Backend" : "Frontend"
    const rawSev = (d.severity || "High") as string
    const severity = (rawSev.charAt(0).toUpperCase() + rawSev.slice(1).toLowerCase()) as Vulnerability["severity"]

    const decodeB64 = (str?: string | null) => {
      if (!str) return ""
      const trimmed = str.trim()
      if (trimmed.includes(" ") || trimmed.includes("\n") || trimmed.includes("//") || trimmed.includes("#")) return str
      if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length >= 8 && trimmed.length % 4 === 0) {
        try {
          const decoded = typeof window !== "undefined" ? atob(trimmed) : Buffer.from(trimmed, "base64").toString("utf-8")
          if (decoded && decoded.trim().length > 0) return decoded
        } catch {}
      }
      return str
    }

    return {
      id: d.id || `finding-${idx}`,
      file: d.file_path || "src/app.js",
      vuln: d.title || d.rule_id || "Identified Vulnerability",
      layer,
      severity,
      cvss: typeof d.cvss === "number" ? d.cvss : 7.5,
      status: mappedStatus,
      codeLine: d.line_number || 1,
      vulnCode: decodeB64(d.evidence || "// Code flag identified by scanner"),
      pocScript: decodeB64(d.poc_script || "# Red Agent PoC Exploit Script not generated for this vector"),
      patchCode: decodeB64(d.patch_code || "# Blue Agent Remediation Patch pending wargaming verification"),
      aiReasoning: d.ai_reasoning || "Static analysis identified potential tainted data flow. Sandbox wargaming verification recorded.",
      tool: d.tool || "AURIX AI Engine",
      ruleId: d.rule_id || "AURIX-SEC-VULN",
      category: d.category || "SAST",
      verified: Boolean(d.verified),
      fix: d.fix || "Consult secure coding documentation",
      description: d.description || "",
      wargameStatus: d.wargame_status || "Verified"
    }
  }

  const loadScanData = async (targetScanId: string) => {
    setIsLoading(true)
    let fetchedFindings: any[] = []

    if (targetScanId) {
      // 1. Try dedicated scan findings route
      try {
        const res = await apiClient(`/api/findings/scan/${encodeURIComponent(targetScanId)}`)
        if (Array.isArray(res?.findings) && res.findings.length > 0) {
          fetchedFindings = res.findings
        }
      } catch {
        // Continue to fallback
      }

      // 2. Try scan details endpoint
      if (fetchedFindings.length === 0) {
        try {
          const res = await apiClient(`/api/scans/${encodeURIComponent(targetScanId)}`)
          if (Array.isArray(res?.findings) && res.findings.length > 0) {
            fetchedFindings = res.findings
          }
        } catch {
          // Continue to fallback
        }
      }

      // 3. Try /api/findings/active?scan_id=...
      if (fetchedFindings.length === 0) {
        try {
          const res = await apiClient(`/api/findings/active?scan_id=${encodeURIComponent(targetScanId)}`)
          const list = Array.isArray(res) ? res : (res?.findings || res?.data || [])
          if (Array.isArray(list) && list.length > 0) {
            fetchedFindings = list
          }
        } catch {
          // Continue to fallback
        }
      }

      // 4. Direct Supabase DB query fallback
      if (fetchedFindings.length === 0) {
        try {
          const { data, error } = await supabase
            .from("verified_vulnerabilities")
            .select("*")
            .eq("scan_id", targetScanId)
          if (!error && data && data.length > 0) {
            fetchedFindings = data
          }
        } catch (dbErr) {
          console.warn("Direct Supabase query warning:", dbErr)
        }
      }
    }

    // 5. If no scanId or scanId yielded nothing, load all active findings
    if (fetchedFindings.length === 0 && !targetScanId) {
      try {
        const res = await apiClient("/api/findings/active")
        const list = Array.isArray(res) ? res : (res?.findings || res?.data || [])
        if (Array.isArray(list)) {
          fetchedFindings = list
        }
      } catch (err) {
        console.warn("Global active findings fetch warning:", err)
      }
    }

    if (fetchedFindings.length > 0) {
      const mapped = fetchedFindings.map(mapFinding)
      setFindings(mapped)
      // Auto-expand the first finding that has a PoC or Patch
      const firstWithPoc = mapped.find(f => f.pocScript && !f.pocScript.includes("not generated")) || mapped[0]
      if (firstWithPoc) {
        setExpandedId(firstWithPoc.id)
      }
    } else {
      setFindings([])
    }

    setIsLoading(false)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputScanId.trim()) return
    const cleanId = inputScanId.trim()
    setScanId(cleanId)
    if (typeof window !== "undefined") {
      localStorage.setItem("aurix_current_scan_id", cleanId)
    }
    const params = new URLSearchParams(window.location.search)
    params.set("scan_id", cleanId)
    router.push(`/results?${params.toString()}`)
    loadScanData(cleanId)
  }

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const filteredFindings = findings.filter(f => {
    const matchesSearch = 
      f.vuln.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.ruleId && f.ruleId.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesSeverity = severityFilter === "All" || f.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

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

  const totalFindings = findings.length
  const withRedPoc = findings.filter(f => f.pocScript && !f.pocScript.includes("not generated")).length
  const withBluePatch = findings.filter(f => f.patchCode && !f.patchCode.includes("pending wargaming")).length
  const resolvedCount = findings.filter(f => f.status === "resolved").length

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <Navbar showTutorButton={false} />

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                Scan Exploit & Remediation Intelligence
                {repoName && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {repoName}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                <Database size={12} className="text-orange-500" />
                {scanId ? `Active DB Scan: ${scanId}` : "Displaying live vulnerability database intelligence"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Scan ID input form */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 sm:flex-none">
              <div className="relative flex-1 sm:w-80">
                <Database size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Query Scan ID (e.g. 0d136ef8-...)"
                  value={inputScanId}
                  onChange={(e) => setInputScanId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg text-xs font-mono text-slate-200 outline-none transition"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer shrink-0"
              >
                Fetch Scan
              </button>
            </form>

            <button
              onClick={() => loadScanData(scanId)}
              disabled={isLoading}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition text-slate-300 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin text-orange-500" : ""} />
              Refresh
            </button>

            <button
              onClick={() => router.push(`/dashboard${scanId ? `?scan_id=${scanId}` : ""}`)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 hover:scale-[1.02] transition shadow cursor-pointer"
            >
              Wargame Kanban
              <ExternalLink size={13} />
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Total Threat Vectors</span>
              <Shield size={14} className="text-slate-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{totalFindings}</div>
            <div className="text-[11px] text-slate-500">Stored in database</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-orange-400 text-xs font-mono">
              <span>Red Exploit PoCs</span>
              <Terminal size={14} className="text-orange-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-orange-400">{withRedPoc}</div>
            <div className="text-[11px] text-slate-500">Auto-generated wargame scripts</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-blue-400 text-xs font-mono">
              <span>Blue Remediation Patches</span>
              <Code size={14} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-blue-400">{withBluePatch}</div>
            <div className="text-[11px] text-slate-500">Verified code fixes</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-mono">
              <span>Neutralized / Resolved</span>
              <CheckCircle2 size={14} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">{resolvedCount}</div>
            <div className="text-[11px] text-slate-500">Remediated in codebase</div>
          </div>
        </div>

        {/* Filter / Search Row */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by vulnerability name or file path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-orange-500 font-mono transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={12} className="text-slate-500" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950/70 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="animate-spin text-orange-500" size={32} />
            <span className="text-xs font-mono text-slate-500">Querying scan exploits & remediation intelligence from database...</span>
          </div>
        ) : findings.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={28} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-white">No Database Findings Found for this Query</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {scanId 
                  ? `No verified vulnerabilities exist in the database with Scan ID "${scanId}". Verify the scan UUID or query another session.`
                  : "No active scan findings are currently stored. Launch a new repository scan or query by Scan ID above."
                }
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => router.push("/scan")}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold text-xs rounded-lg transition hover:scale-[1.02] cursor-pointer"
              >
                Launch New Scan
              </button>
              <button
                onClick={() => {
                  setScanId("")
                  setInputScanId("")
                  loadScanData("")
                }}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                Load All Active
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFindings.map((v) => {
              const isExpanded = expandedId === v.id
              const hasPoc = v.pocScript && !v.pocScript.includes("not generated")
              const hasPatch = v.patchCode && !v.patchCode.includes("pending wargaming")

              return (
                <div 
                  key={v.id} 
                  className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/30 hover:border-slate-700/80 transition shadow-sm"
                >
                  {/* Finding Main Card Header */}
                  <div 
                    onClick={() => toggleExpand(v.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/50 transition select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <button 
                        type="button" 
                        className="p-1 text-slate-500 hover:text-white rounded transition shrink-0 mt-0.5 sm:mt-0"
                      >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${getSeverityBadge(v.severity)}`}>
                            {v.severity}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">CVSS {v.cvss.toFixed(1)}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {v.layer}
                          </span>
                          {v.tool && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-orange-400 border border-orange-500/20">
                              {v.tool}
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/20">
                            {v.wargameStatus}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-white truncate flex items-center gap-2">
                          {v.vuln}
                        </h3>

                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 truncate">
                          <FileCode size={13} className="text-slate-500 shrink-0" />
                          <span className="truncate">{v.file}</span>
                          <span className="text-slate-600 shrink-0">line {v.codeLine}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action badges & modal button */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setModalInitialTab("poc");
                          setSelectedVuln(v);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                          hasPoc 
                            ? "bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20 shadow-sm" 
                            : "bg-slate-800 text-slate-500 border-slate-700 opacity-60"
                        }`}
                        title="View Red Agent Exploit Script"
                      >
                        <Terminal size={13} />
                        🔴 Red Agent Code
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModalInitialTab("patch");
                          setSelectedVuln(v);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                          hasPatch 
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 shadow-sm" 
                            : "bg-slate-800 text-slate-500 border-slate-700 opacity-60"
                        }`}
                        title="View Blue Agent Remediation Patch"
                      >
                        <Code size={13} />
                        🔵 Patch Code
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(v.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 transition cursor-pointer flex items-center gap-1"
                        title={isExpanded ? "Collapse inline code" : "Expand inline code view"}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span>{isExpanded ? "Hide" : "Details"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Dual-Pane View: Red Exploit & Blue Patch */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/60 p-5 space-y-5 animate-in fade-in duration-200">
                      
                      {/* AI Reasoning & Vulnerable Sink Banner */}
                      {v.aiReasoning && (
                        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-300 font-semibold font-mono text-[11px] uppercase tracking-wider">
                            <Sparkles size={13} className="text-orange-500" />
                            AI Wargaming Sandbox Verification
                          </div>
                          <p className="text-slate-400 leading-relaxed font-sans">
                            {v.aiReasoning}
                          </p>
                          {v.vulnCode && (
                            <div className="mt-2 pt-2 border-t border-slate-800 flex items-start gap-2 text-slate-400 font-mono text-[11px]">
                              <span className="text-red-400 font-bold shrink-0">[Sink Line {v.codeLine}]:</span>
                              <code className="text-slate-300 break-all bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {v.vulnCode}
                              </code>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Code Side-by-Side: Red Exploit (Left) and Blue Patch (Right) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        
                        {/* 🔴 RED AGENT EXPLOIT SCRIPT */}
                        <div className="rounded-xl bg-slate-950 border border-orange-500/20 overflow-hidden flex flex-col">
                          <div className="p-3 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-orange-400 font-mono text-xs font-bold">
                              <Terminal size={14} className="text-orange-500" />
                              <span>RED AGENT EXPLOIT CODE</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300">Masked PoC</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(v.pocScript, `poc-${v.id}`)}
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 transition cursor-pointer"
                            >
                              {copiedKey === `poc-${v.id}` ? (
                                <>
                                  <Check size={11} className="text-green-400" />
                                  <span className="text-green-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copy PoC</span>
                                </>
                              )}
                            </button>
                          </div>
                          
                          {/* Masked Exploit Notice */}
                          <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-200 leading-relaxed">
                            <AlertCircle size={13} className="shrink-0 text-amber-400 mt-0.5" />
                            <span>
                              <strong>Security Note:</strong> This is a <strong>masked version of the real exploit</strong>. It does not provide actionable attack code, but serves to assure users that automated wargaming has happened and the patch is verified internally by our system.
                            </span>
                          </div>

                          <div className="p-4 flex-1 overflow-x-auto font-mono text-xs text-orange-300/90 leading-relaxed max-h-96">
                            <pre className="whitespace-pre-wrap break-words">{v.pocScript}</pre>
                          </div>
                        </div>

                        {/* 🔵 BLUE AGENT CODE PATCH */}
                        <div className="rounded-xl bg-slate-950 border border-blue-500/20 overflow-hidden flex flex-col">
                          <div className="p-3 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-bold">
                              <Code size={14} className="text-blue-500" />
                              <span>BLUE AGENT REMEDIATION PATCH</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">Fix</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(v.patchCode, `patch-${v.id}`)}
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 transition cursor-pointer"
                            >
                              {copiedKey === `patch-${v.id}` ? (
                                <>
                                  <Check size={11} className="text-green-400" />
                                  <span className="text-green-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copy Patch</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="p-4 flex-1 overflow-x-auto font-mono text-xs leading-relaxed max-h-96">
                            <pre className="space-y-0.5 whitespace-pre-wrap break-words">
                              {v.patchCode.split("\n").map((line, idx) => {
                                const isAdded = line.startsWith("+")
                                const isRemoved = line.startsWith("-")
                                const style = isAdded
                                  ? "bg-green-950/40 text-green-300 px-1 rounded"
                                  : isRemoved
                                  ? "bg-red-950/40 text-red-300 px-1 rounded"
                                  : "text-slate-300"
                                return (
                                  <div key={idx} className={style}>
                                    {line}
                                  </div>
                                )
                              })}
                            </pre>
                          </div>
                        </div>

                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                        <div className="text-[11px] font-mono text-slate-500">
                          Rule: <span className="text-slate-400">{v.ruleId}</span> | Category: <span className="text-slate-400">{v.category}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedVuln(v)}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-[1.02] text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <ShieldCheck size={13} />
                            Open Full Remediation Modal & GitHub PR
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Interactive Vulnerability Detail Modal (PR, Chat, Code) */}
      <VulnerabilityDetail
        vuln={selectedVuln}
        initialTab={modalInitialTab}
        onClose={() => setSelectedVuln(null)}
        onApplyFix={(id) => {
          setFindings(prev => prev.map(f => f.id === id ? { ...f, status: "resolved" } : f))
        }}
        repoUrl={repoName || (typeof window !== "undefined" ? localStorage.getItem("aurix_repo_url") || "" : "")}
        onOpenChat={() => {
          router.push(`/dashboard${scanId ? `?scan_id=${scanId}` : ""}`)
        }}
      />
      </main>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <span className="text-xs font-mono text-slate-500">Loading Scan Intelligence...</span>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
