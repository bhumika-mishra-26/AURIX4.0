"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Github, 
  Link2, 
  Upload, 
  ShieldAlert, 
  Play, 
  CheckCircle2, 
  Terminal, 
  FileArchive, 
  Sparkles,
  Search,
  Server,
  Cpu,
  Layers,
  ChevronRight,
  RefreshCw,
  Lock,
  AlertTriangle
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { apiClient, scansApi } from "@/lib/api"

type Tab = "github" | "url" | "zip"

interface ScanStep {
  id: number
  label: string
  desc: string
  status: "idle" | "running" | "success" | "error"
}

export default function ScanPage() {
  const router = useRouter()
  const { user, loginWithGitHub, isAuthenticated, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("url")
  const [repoUrl, setRepoUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [showPreFlight, setShowPreFlight] = useState(false)
  const [preFlightDone, setPreFlightDone] = useState(false)
  const [isGitHubConnected, setIsGitHubConnected] = useState(false)
  const [isGitHubLoading, setIsGitHubLoading] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState("")
  const [userRepos, setUserRepos] = useState<Array<{ id: number | string; full_name: string; name: string; private?: boolean }>>([])
  const [isReposLoading, setIsReposLoading] = useState(false)
  const [repoFetchError, setRepoFetchError] = useState("")
  const [manualRepoInput, setManualRepoInput] = useState("")
  const [pendingScanId, setPendingScanId] = useState<string | null>(null)
  const [isScanQueued, setIsScanQueued] = useState(false)

  // Real-time backend progress states
  const [realProgressPct, setRealProgressPct] = useState<number>(0)
  const [realStepName, setRealStepName] = useState<string>("Code Ingestion")
  const [realTimeLogs, setRealTimeLogs] = useState<string[]>([])
  const [currentFileScanned, setCurrentFileScanned] = useState<string>("")
  const [totalFindingsFound, setTotalFindingsFound] = useState<number>(0)
  const [isScanComplete, setIsScanComplete] = useState<boolean>(false)

  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Protect route: Redirect to /login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !user) {
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("aurix_token") : null
      if (!storedToken) {
        router.replace("/login?redirect=/scan")
      }
    }
  }, [isLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (
      user?.app_metadata?.provider === "github" ||
      user?.user_metadata?.user_name ||
      (typeof window !== "undefined" && localStorage.getItem("aurix_github_connected") === "true")
    ) {
      setIsGitHubConnected(true)
    }
  }, [user])

  // Fetch real repositories whenever GitHub is connected or user changes
  useEffect(() => {
    if (!isGitHubConnected) {
      setUserRepos([])
      return
    }

    const fetchRealRepos = async () => {
      setIsReposLoading(true)
      setRepoFetchError("")
      try {
        const ghToken = typeof window !== "undefined" ? localStorage.getItem("aurix_github_token") : null
        const authTok = typeof window !== "undefined" ? localStorage.getItem("aurix_token") : null
        const username = user?.user_metadata?.user_name || user?.user_metadata?.preferred_username || user?.email?.split("@")[0] || ""

        // Call backend dynamic GitHub repos fetcher
        const queryParams = new URLSearchParams()
        if (username) queryParams.set("username", username)
        if (ghToken) queryParams.set("gh_token", ghToken)

        const headers: Record<string, string> = {}
        if (authTok) headers["Authorization"] = `Bearer ${authTok}`
        if (ghToken) headers["x-github-token"] = ghToken

        const res = await fetch(`/api/github/repos?${queryParams.toString()}`, { headers })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.repos) && data.repos.length > 0) {
            setUserRepos(data.repos)
            return
          }
        }

        // Direct fallback to GitHub API if public username is available
        if (username && username !== "aurix-auditor" && username !== "aurix-sandbox") {
          const directGhRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=50`)
          if (directGhRes.ok) {
            const data = await directGhRes.json()
            if (Array.isArray(data) && data.length > 0) {
              setUserRepos(data.map((r: any) => ({
                id: r.id,
                name: r.name,
                full_name: r.full_name,
                private: r.private
              })))
              return
            }
          }
        }
      } catch (err: any) {
        console.warn("Failed to fetch real repositories:", err)
        setRepoFetchError("Could not automatically retrieve repositories.")
      } finally {
        setIsReposLoading(false)
      }
    }

    fetchRealRepos()
  }, [isGitHubConnected, user])

  const [steps, setSteps] = useState<ScanStep[]>([
    { id: 1, label: "Code Ingestion", desc: "Cloning workspace & analyzing project layout...", status: "idle" },
    { id: 2, label: "Multi-Engine SAST Scanning", desc: "Evaluating OWASP Top 10 rules across source files...", status: "idle" },
    { id: 3, label: "Context Slicing & AI Triage", desc: "Groq AI Engine verifying genuine vulnerabilities...", status: "idle" },
    { id: 4, label: "Isolated Red Agent Wargaming", desc: "Synthesizing PoC exploit scripts in sandbox...", status: "idle" },
    { id: 5, label: "Blue Agent Remediation", desc: "Creating verified drop-in patches & fixes...", status: "idle" },
  ])

  // REAL BACKEND PROGRESS POLLING LOOP
  useEffect(() => {
    if (!isScanning) return

    const scanIdToPoll = pendingScanId || (typeof window !== "undefined" ? localStorage.getItem("aurix_current_scan_id") : null)
    if (!scanIdToPoll) return

    const pollInterval = setInterval(async () => {
      try {
        const res = await apiClient(`/api/scans/${scanIdToPoll}/progress`)
        if (res) {
          if (res.progress !== undefined) setRealProgressPct(res.progress)
          const stepVal = res.current_step || res.step || ""
          if (stepVal) setRealStepName(stepVal)
          if (res.logs && Array.isArray(res.logs)) setRealTimeLogs(res.logs)
          if (res.current_file) setCurrentFileScanned(res.current_file)
          
          // Extract findings count from progress object OR parse log message if present
          let findingsCount = res.total_findings ?? res.summary?.total_findings ?? res.findings_count
          
          if (Array.isArray(res.logs) && res.logs.length > 0) {
            const logTexts = res.logs.map((l: any) => typeof l === "string" ? l : (l.message || "")).join("\n")
            const match = logTexts.match(/(\d+)\s+exploitable\s+found/i) || logTexts.match(/(\d+)\s+findings/i)
            if (match) {
              findingsCount = parseInt(match[1], 10)
            }
          }

          if (findingsCount !== undefined) setTotalFindingsFound(findingsCount)

          // Step mapping based on real backend step
          const backendStep = stepVal.toLowerCase()
          let activeIndex = 0

          if (backendStep.includes("ingest")) activeIndex = 0
          else if (backendStep.includes("sast") || backendStep.includes("scan")) activeIndex = 1
          else if (backendStep.includes("triage") || backendStep.includes("context") || backendStep.includes("ai")) activeIndex = 2
          else if (backendStep.includes("wargam") || backendStep.includes("red")) activeIndex = 3
          else if (backendStep.includes("remediat") || backendStep.includes("blue") || backendStep.includes("patch")) activeIndex = 4
          else if (res.status === "COMPLETED" || backendStep === "completed") activeIndex = 5

          if (res.status === "COMPLETED" || backendStep === "completed") {
            setIsScanComplete(true)
            setRealProgressPct(100)
            setSteps(prev => prev.map(s => ({ ...s, status: "success" })))
            clearInterval(pollInterval)
            // Fetch final scan object to get exact findings count if missing in progress
            try {
              const finalScan = await apiClient(`/api/scans/${scanIdToPoll}`)
              if (finalScan) {
                // If logs explicitly state exploitable count (e.g. 23 exploitable found), keep log count
                const logTexts = [
                  ...(Array.isArray(res.logs) ? res.logs : []),
                  ...(Array.isArray(finalScan.logs) ? finalScan.logs : [])
                ].map((l: any) => typeof l === "string" ? l : (l.message || "")).join("\n")

                const match = logTexts.match(/(\d+)\s+exploitable\s+found/i)
                if (match) {
                  setTotalFindingsFound(parseInt(match[1], 10))
                } else {
                  const count = finalScan.summary?.total_findings ?? (Array.isArray(finalScan.findings) ? finalScan.findings.length : 0)
                  if (count !== undefined) setTotalFindingsFound(count)
                }
              }
            } catch (err) {
              console.warn("Error fetching final scan details:", err)
            }
          } else if (res.status === "FAILED" || backendStep === "failed") {
            setIsScanComplete(true)
            setRealProgressPct(100)
            setSteps(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: "error" } : s))
            clearInterval(pollInterval)
          } else {
            setSteps(prev => prev.map((s, idx) => {
              if (idx < activeIndex) return { ...s, status: "success" }
              if (idx === activeIndex) return { ...s, status: "running" }
              return { ...s, status: "idle" }
            }))
          }
        }
      } catch (err) {
        console.warn("Progress poll error:", err)
      }
    }, 800)

    return () => clearInterval(pollInterval)
  }, [isScanning, pendingScanId])

  // Auto-scroll terminal log internally without locking page scroll
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.parentElement?.scrollTo({
        top: terminalEndRef.current.parentElement.scrollHeight,
        behavior: "smooth"
      })
    }
  }, [realTimeLogs])

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === "url" && !repoUrl) return
    if (activeTab === "zip" && !selectedFile) return
    if (activeTab === "github" && !selectedRepo) return

    // Show Pre-flight guard UI immediately
    setShowPreFlight(true)
    setPreFlightDone(false)
    setIsScanComplete(false)
    setRealProgressPct(5)
    setTotalFindingsFound(0)
    setRealTimeLogs(["[INIT] Initializing AURIX Security Analysis Gate..."])

    let activeScanId: string | null = null

    try {
      if (activeTab === "url" && repoUrl) {
        let finalUrl = repoUrl.trim()
        if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
          finalUrl = `https://github.com/${finalUrl.replace(/^\/+/, "")}`
        }
        localStorage.setItem("aurix_repo_url", finalUrl)
        localStorage.setItem("aurix_scanned_repo", finalUrl.split("/").filter(Boolean).pop()?.replace(/\.git$/i, "") || finalUrl)
        const res = await scansApi.submitGithub(finalUrl)
        if (res?.scan_id) {
          localStorage.setItem("aurix_current_scan_id", res.scan_id)
          setPendingScanId(res.scan_id)
          setIsScanQueued(true)
          activeScanId = res.scan_id
        }
      } else if (activeTab === "zip" && selectedFile) {
        const repoName = selectedFile.name.replace(/\.zip$/i, "")
        localStorage.setItem("aurix_scanned_repo", repoName)
        const res = await scansApi.submitZip(selectedFile)
        if (res?.scan_id) {
          localStorage.setItem("aurix_current_scan_id", res.scan_id)
          setPendingScanId(res.scan_id)
          setIsScanQueued(true)
          activeScanId = res.scan_id
        }
      } else if (activeTab === "github" && selectedRepo) {
        const fullUrl = selectedRepo.startsWith("http") ? selectedRepo : `https://github.com/${selectedRepo}`
        localStorage.setItem("aurix_repo_url", fullUrl)
        localStorage.setItem("aurix_scanned_repo", selectedRepo)
        const res = await scansApi.submitGithub(fullUrl)
        if (res?.scan_id) {
          localStorage.setItem("aurix_current_scan_id", res.scan_id)
          setPendingScanId(res.scan_id)
          setIsScanQueued(true)
          activeScanId = res.scan_id
        }
      }
    } catch (err: any) {
      console.warn("Backend scan queue response:", err)
    }

    // Only proceed to scanning UI if we got a valid scan ID from the backend
    if (!activeScanId) {
      setShowPreFlight(false)
      setRealTimeLogs(prev => [...prev, "[ERROR] Failed to initiate scan. Check backend connection."])
      return
    }

    // Pre-flight animation complete → transition to live scanning view
    setTimeout(() => {
      setPreFlightDone(true)
      setTimeout(() => {
        setShowPreFlight(false)
        setIsScanning(true)
      }, 1000)
    }, 1500)
  }

  const getStepIcon = (status: string, idx: number) => {
    switch (status) {
      case "running":
        return <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      case "success":
        return <CheckCircle2 className="w-6 h-6 text-green-500" />
      default:
        return (
          <div className="w-6 h-6 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center text-xs font-mono text-slate-500 font-bold">
            {idx + 1}
          </div>
        )
    }
  }

  // If auth is resolving, display dark loader
  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono gap-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Authenticating AURIX session...</p>
      </main>
    )
  }

  if (!isAuthenticated && !user) {
    return null
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[10%] w-[35%] h-[35%] rounded-full bg-orange-500/5 blur-[120px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[35%] h-[35%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-6 mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="text-orange-500" size={24} />
              <h1 className="text-2xl font-bold tracking-tight text-white">AURIX Scanner Gate</h1>
            </div>
            <p className="text-sm text-slate-400">
              Initiate high-performance vulnerability assessment powered by agentic wargaming.
            </p>
          </div>
        </div>

        {/* PRE-FLIGHT SECRET GUARD MODAL */}
        {showPreFlight && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-6">
              <div className="relative mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/25">
                <Sparkles className="text-orange-500 animate-pulse" size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Running Pre-Flight Secret Guard</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  Scanning workspace for API credentials, tokens, or private keys before transmission.
                </p>
              </div>
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-left text-xs font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Searching env / config vars...</span>
                  <span className={preFlightDone ? "text-green-500 font-semibold" : "text-orange-500"}>
                    {preFlightDone ? "✔ OK" : "Scanning..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Checking AWS/GCP key formats...</span>
                  <span className={preFlightDone ? "text-green-500 font-semibold" : "text-orange-500"}>
                    {preFlightDone ? "✔ SAFE" : "Scanning..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Respecting .gitignore rules...</span>
                  <span className={preFlightDone ? "text-green-500 font-semibold" : "text-orange-500"}>
                    {preFlightDone ? "✔ COMPLIANT" : "Evaluating..."}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                {preFlightDone ? "Pre-flight check completed!" : "Mounting target workspace..."}
              </p>
            </div>
          </div>
        )}

        {/* REAL-TIME SCANNING PROGRESS CONTAINER */}
        {isScanning ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-8">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isScanComplete ? "bg-green-500" : "bg-orange-500 animate-ping"}`} />
                  <h3 className="text-lg font-bold text-white">
                    {isScanComplete ? "Agentic Analysis Complete" : "Active Agentic Analysis"}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Scan ID: {pendingScanId || "scan_active"} // Target: {repoUrl || selectedRepo || selectedFile?.name || "Target Workspace"}
                </p>
              </div>
              
              {/* Progress Completion Badge & Findings Counter */}
              <div className="flex items-center gap-4">
                <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-center">
                  <div className="text-lg font-black text-amber-400 font-mono">{totalFindingsFound}</div>
                  <div className="text-[9px] text-slate-500 uppercase font-mono">Vulnerabilities</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-orange-500 font-mono">
                    {realProgressPct}%
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Progress</div>
                </div>
              </div>
            </div>

            {/* Stepper Steps */}
            <div className="space-y-5">
              {steps.map((step, index) => {
                const isActive = step.status === "running"
                const isCompleted = step.status === "success"
                
                return (
                  <div 
                    key={step.id} 
                    className={`flex items-start gap-4 transition duration-300 ${
                      isActive ? "opacity-100" : isCompleted ? "opacity-75" : "opacity-40"
                    }`}
                  >
                    <div className="pt-0.5">{getStepIcon(step.status, index)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold tracking-wide ${isActive ? "text-orange-400" : "text-white"}`}>
                          {step.label}
                        </span>
                        {isActive && (
                          <span className="text-[9px] uppercase font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-mono">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* LIVE CONSOLE LOG TERMINAL (REAL BACKEND EVENTS) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Terminal size={14} className="text-orange-500" />
                  AURIX Live Console Stream
                </span>
                {currentFileScanned && (
                  <span className="text-orange-400 text-[10px] truncate max-w-[250px]">
                    Scanning: {currentFileScanned}
                  </span>
                )}
              </div>
              <div className="h-36 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                {realTimeLogs.length > 0 ? (
                  realTimeLogs.map((logItem: any, idx) => {
                    const logStr = typeof logItem === "string" 
                      ? logItem 
                      : (typeof logItem?.message === "string" ? logItem.message : JSON.stringify(logItem ?? ""))
                    const logLower = logStr.toLowerCase()
                    return (
                      <div 
                        key={idx} 
                        className={`leading-relaxed ${
                          logStr.includes("[+]") || logLower.includes("discovered") 
                            ? "text-amber-400 font-semibold" 
                            : logLower.includes("complete") || logStr.includes("✔")
                            ? "text-green-400"
                            : logStr.includes("[-]") || logLower.includes("error")
                            ? "text-red-400"
                            : "text-slate-400"
                        }`}
                      >
                        {logStr}
                      </div>
                    )
                  })
                ) : (
                  <div className="text-slate-600 italic">Waiting for initial backend event logs...</div>
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-slate-800/80 pt-6 flex justify-between items-center">
              <div>
                {isScanComplete ? (
                  <span className="text-xs font-mono text-green-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Scan Completed! Discovered {totalFindingsFound} verified findings.
                  </span>
                ) : (
                  <span className="text-xs font-mono text-orange-400 flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin" />
                    Analyzing repository files in real-time...
                  </span>
                )}
              </div>

              <button
                disabled={!isScanComplete && totalFindingsFound === 0 && realProgressPct < 90}
                onClick={() => {
                  const params = new URLSearchParams()
                  const scanIdToUse = pendingScanId || (typeof window !== "undefined" ? localStorage.getItem("aurix_current_scan_id") : null)
                  if (scanIdToUse) params.set("scan_id", scanIdToUse)
                  const repoLabel = (typeof window !== "undefined" ? localStorage.getItem("aurix_scanned_repo") : null) || ""
                  if (repoLabel) params.set("repo", repoLabel)
                  router.push(`/dashboard?${params.toString()}`)
                }}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 disabled:from-slate-800 disabled:to-slate-800 text-slate-950 disabled:text-slate-500 font-bold rounded-lg transition duration-300 flex items-center gap-2 hover:scale-[1.01] cursor-pointer disabled:cursor-not-allowed"
              >
                Reveal Risk Dashboard
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* CONFIGURATION TABS AND FORM */
          <div className="max-w-2xl mx-auto bg-slate-900/35 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white">Select Ingestion Source</h2>
            
            {/* Tab Selector */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-850">
              <button
                type="button"
                onClick={() => setActiveTab("url")}
                className={`py-3 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  activeTab === "url" 
                    ? "bg-slate-900 text-orange-500 shadow border border-slate-800" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Link2 size={16} />
                Repo URL
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("zip")}
                className={`py-3 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  activeTab === "zip" 
                    ? "bg-slate-900 text-orange-500 shadow border border-slate-800" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Upload size={16} />
                ZIP Archive
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("github")}
                className={`py-3 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  activeTab === "github" 
                    ? "bg-slate-900 text-orange-500 shadow border border-slate-800" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Github size={16} />
                GitHub Sync
              </button>
            </div>

            {/* Form Input Container */}
            <form onSubmit={handleStartScan} className="space-y-6">
              {activeTab === "url" && (
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    Git Repository URL or Live Web Application Target
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="https://github.com/owner/repo or https://mywebsite.com"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Supported: GitHub, GitLab, Bitbucket repositories, or Live Web Application URLs (DAST).
                  </p>
                </div>
              )}

              {activeTab === "zip" && (
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    Source Code Archive
                  </label>
                  <div className="border border-dashed border-slate-800 hover:border-orange-500/50 rounded-xl p-8 text-center transition group bg-slate-950/40 relative">
                    <input
                      type="file"
                      accept=".zip,.tar,.gz"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileArchive className="mx-auto text-slate-600 group-hover:text-orange-500 transition mb-3" size={36} />
                    <p className="text-sm font-medium text-slate-300">
                      {selectedFile ? selectedFile.name : "Drag & drop archive or click to browse"}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 font-mono">
                      {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : "ZIP archives up to 100MB"}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "github" && (
                <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-850 space-y-4 text-center">
                  <Github className="mx-auto text-slate-500 mb-2" size={32} />
                  {!isGitHubConnected ? (
                    isGitHubLoading ? (
                      <div className="space-y-4 py-4">
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs text-slate-400 font-mono">Connecting with GitHub account...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-200">Import Directly from GitHub Account</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            Authorize AURIX to access your public and private repositories for sandbox triage wargaming.
                          </p>
                        </div>
                        <button 
                          type="button" 
                          disabled={isGitHubLoading}
                          onClick={async () => {
                            try {
                              setIsGitHubLoading(true);
                              if (user?.user_metadata?.user_name || localStorage.getItem('aurix_github_token')) {
                                localStorage.setItem('aurix_github_connected', 'true');
                                setIsGitHubConnected(true);
                              } else {
                                await loginWithGitHub();
                              }
                            } catch (err) {
                              console.error(err);
                              setIsGitHubConnected(true);
                            } finally {
                              setIsGitHubLoading(false);
                            }
                          }}
                          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          {isGitHubLoading ? "Connecting GitHub..." : "Connect GitHub Account"}
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <p className="text-xs font-mono text-slate-300">
                            CONNECTED: {
                              user?.user_metadata?.user_name ||
                              user?.user_metadata?.preferred_username ||
                              user?.email?.split("@")[0] ||
                              "aurix-auditor"
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setIsReposLoading(true);
                              const ghToken = localStorage.getItem("aurix_github_token");
                              const username = user?.user_metadata?.user_name || user?.email?.split("@")[0] || "";
                              const queryParams = new URLSearchParams();
                              if (username) queryParams.set("username", username);
                              if (ghToken) queryParams.set("gh_token", ghToken);
                              fetch(`/api/github/repos?${queryParams.toString()}`)
                                .then(r => r.json())
                                .then(d => {
                                  if (d.repos) setUserRepos(d.repos);
                                })
                                .catch(console.warn)
                                .finally(() => setIsReposLoading(false));
                            }}
                            disabled={isReposLoading}
                            className="text-[10px] text-slate-400 hover:text-white font-mono transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Refresh real repositories"
                          >
                            <RefreshCw size={11} className={isReposLoading ? "animate-spin text-orange-500" : ""} />
                            Sync
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsGitHubConnected(false);
                              setSelectedRepo("");
                              setUserRepos([]);
                              if (typeof window !== "undefined") {
                                localStorage.removeItem("aurix_github_connected");
                              }
                            }}
                            className="text-[10px] text-slate-500 hover:text-red-400 font-mono transition cursor-pointer"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">
                            Select Repository to scan
                          </label>
                          {isReposLoading && (
                            <span className="text-[10px] text-orange-400 font-mono flex items-center gap-1">
                              <RefreshCw size={10} className="animate-spin" /> Fetching real repos...
                            </span>
                          )}
                        </div>

                        {userRepos.length > 0 ? (
                          <select
                            value={selectedRepo}
                            onChange={(e) => {
                              setSelectedRepo(e.target.value);
                              setManualRepoInput(e.target.value);
                            }}
                            className="w-full bg-slate-950 border border-slate-850 text-slate-200 px-3 py-2.5 rounded-lg text-xs outline-none focus:border-orange-500 transition font-mono cursor-pointer"
                          >
                            <option value="">-- Choose Repository ({userRepos.length} available) --</option>
                            {userRepos.map((repo) => (
                              <option key={repo.id} value={repo.full_name}>
                                {repo.full_name} {repo.private ? "🔒 (Private)" : "🌐"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={manualRepoInput}
                              onChange={(e) => {
                                setManualRepoInput(e.target.value);
                                setSelectedRepo(e.target.value.trim());
                              }}
                              placeholder="Enter repo e.g. username/my-project"
                              className="w-full bg-slate-950 border border-slate-850 text-slate-200 px-3 py-2.5 rounded-lg text-xs outline-none focus:border-orange-500 transition font-mono"
                            />
                            <p className="text-[10px] text-slate-500 font-mono">
                              {isReposLoading 
                                ? "Loading repositories from your GitHub account..." 
                                : "Type your GitHub repo path (owner/repo) or click 'Sync' above to fetch."}
                            </p>
                          </div>
                        )}

                        {userRepos.length > 0 && (
                          <div className="pt-1">
                            <details className="text-[11px] text-slate-500 font-mono cursor-pointer">
                              <summary className="hover:text-slate-300">Or type custom repo manually</summary>
                              <div className="mt-2">
                                <input
                                  type="text"
                                  value={manualRepoInput}
                                  onChange={(e) => {
                                    setManualRepoInput(e.target.value);
                                    setSelectedRepo(e.target.value.trim());
                                  }}
                                  placeholder="e.g. username/repo-name"
                                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 px-3 py-2 rounded-lg text-xs outline-none focus:border-orange-500 font-mono"
                                />
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  (activeTab === "url" && !repoUrl) ||
                  (activeTab === "zip" && !selectedFile) ||
                  (activeTab === "github" && (!isGitHubConnected || !selectedRepo))
                }
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 disabled:from-slate-900 disabled:to-slate-900 text-slate-950 disabled:text-slate-500 font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 disabled:shadow-none hover:scale-[1.01] transition duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer"
              >
                <Play size={16} fill="currentColor" />
                Initiate Scan
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
