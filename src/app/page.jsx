"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import LetterGlitch from "@/components/letter-glitch"
import LogoLoop from "@/components/logo-loop"
import StarBorder from "@/components/star-border"
import {
  Upload,
  Scan,
  ShieldCheck,
  FileText,
  Github,
  Code,
  CloudUpload,
  Link2,
  Terminal,
  ArrowRight,
  Sparkles,
  Sun,
  Moon
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"



function MatrixBackground() {

  useEffect(() => {

    const canvas = document.getElementById("matrixCanvas")
    const ctx = canvas.getContext("2d")

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const letters = "01CODESECURITYVULN"
    const fontSize = 16
    const columns = canvas.width / fontSize

    const drops = []

    for (let x = 0; x < columns; x++) {
      drops[x] = 1
    }

    function draw() {

      ctx.fillStyle = "rgba(0,0,0,0.05)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "#22c55e" // Brighter green for visibility
      ctx.font = fontSize + "px monospace"

      for (let i = 0; i < drops.length; i++) {

        const text = letters[Math.floor(Math.random() * letters.length)]

        ctx.fillText(text, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }

        drops[i]++

      }

    }

    const interval = setInterval(draw, 33)

    return () => clearInterval(interval)

  }, [])


  return (
    <canvas
      id="matrixCanvas"
      className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
    />
  )
}



export default function Home() {
  const router = useRouter()
  const { isAuthenticated, user, isLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [activeStep, setActiveStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use a stable default until the component has mounted on the client.
  // This prevents the SSR/client hydration mismatch caused by auth state
  // being unknown on the server (always "unauthenticated") but resolved on
  // the client after the AuthContext initialises.
  const scanTargetUrl = mounted && (isAuthenticated || user)
    ? "/dashboard"
    : "/login?redirect=/dashboard"

  const handleScanNowClick = () => {
    // Wait for auth to resolve — if authenticated go to dashboard, else go to login
    if (isAuthenticated || user) {
      router.push("/dashboard")
    } else {
      router.push("/login?redirect=/dashboard")
    }
  }

  const securityTech = [
    { node: <span className="text-lg font-black font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 hover:text-orange-500 transition duration-300 cursor-pointer">SEMGREP</span> },
    { node: <span className="text-lg font-black font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 hover:text-orange-500 transition duration-300 cursor-pointer">TRIVY</span> },
    { node: <span className="text-lg font-black font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 hover:text-orange-500 transition duration-300 cursor-pointer">GITLEAKS</span> },
    { node: <span className="text-lg font-black font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 hover:text-orange-500 transition duration-300 cursor-pointer">HADOLINT</span> },
    { node: <span className="text-lg font-black font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 hover:text-orange-500 transition duration-300 cursor-pointer">OWASP</span> },
    { node: <span className="text-lg font-black font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 hover:text-orange-500 transition duration-300 cursor-pointer">DOCKER</span> },
    { node: <span className="text-lg font-black font-mono tracking-[0.22em] text-slate-500 dark:text-slate-400 hover:text-orange-500 transition duration-300 cursor-pointer">SUPABASE</span> }
  ]



  // Continuous auto-advance workflow steps on a 2.8s timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4)
    }, 2800)

    return () => clearInterval(timer)
  }, [])



  const workflow = [
    {
      icon: Upload,
      title: "Upload Code",
      desc: "Upload repository or source files"
    },
    {
      icon: Scan,
      title: "AI Scan",
      desc: "AI scans the codebase"
    },
    {
      icon: ShieldCheck,
      title: "Risk Analysis",
      desc: "Threats categorized by severity"
    },
    {
      icon: FileText,
      title: "Security Report",
      desc: "Download vulnerability report"
    }
  ]


  const features = [
    {
      icon: ShieldCheck,
      title: "AI Vulnerability Detection",
      desc: "Detect security vulnerabilities using AI."
    },
    {
      icon: Scan,
      title: "Automated Code Scanning",
      desc: "Scan repositories instantly."
    },
    {
      icon: Code,
      title: "Developer Friendly",
      desc: "Clean UI built for developers."
    },
    {
      icon: FileText,
      title: "Detailed Reports",
      desc: "Generate vulnerability reports."
    }
  ]


  const scanOptions = [
    {
      icon: Github,
      title: "GitHub OAuth",
      desc: "Connect your GitHub account to scan your private and public repositories securely."
    },
    {
      icon: Link2,
      title: "Manual Repo URL",
      desc: "Paste any public GitHub repository URL to start an instant security analysis."
    },
    {
      icon: Terminal,
      title: "VS Code Extension",
      desc: "Install our VS Code extension to detect vulnerabilities directly in your IDE as you code."
    }
  ]



  return (

    <main className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300">

{/* NAVBAR */}

<nav className="fixed top-0 w-full backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/60 z-50 transition-colors">

<div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">

<div className="flex items-center gap-2.5 group cursor-pointer">
  <div className="relative w-8 h-8 rounded-xl overflow-hidden group-hover:scale-105 transition-transform flex items-center justify-center">
    <img src="/logo.png" alt="AURIX Logo" className="w-full h-full object-contain" />
  </div>
  <h1 className="font-bold text-2xl tracking-tight text-slate-900 dark:text-white">
    AURIX<span className="text-orange-500">.</span>
  </h1>
</div>

<div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">

<a href="#" className="hover:text-orange-500 dark:hover:text-orange-400 transition">Home</a>
<a href="#workflow" className="hover:text-orange-500 dark:hover:text-orange-400 transition">Workflow</a>
<a href="#features" className="hover:text-orange-500 dark:hover:text-orange-400 transition">Features</a>
<a href="#scan" className="hover:text-orange-500 dark:hover:text-orange-400 transition">Scan</a>

</div>

<div className="flex items-center gap-3">
  {/* Theme Toggle */}
  <button
    onClick={toggleTheme}
    className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 rounded-lg text-slate-700 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-500/40 transition shadow-sm cursor-pointer"
    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
  >
    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
  </button>
  {mounted && (isAuthenticated || user) ? (
    <Link href="/dashboard">
      <button className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-lg text-sm hover:scale-105 transition shadow-md shadow-orange-500/20 cursor-pointer">
        Dashboard →
      </button>
    </Link>
  ) : (
    <>
      <Link href="/login">
        <button className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-sm font-semibold transition cursor-pointer">
          Log in
        </button>
      </Link>
      <Link href="/login">
        <button className="px-5 py-2 bg-orange-500 text-white dark:text-slate-950 font-bold rounded-lg text-sm hover:bg-orange-600 dark:hover:bg-orange-400 transition shadow-md shadow-orange-500/10 cursor-pointer">
          Get Started
        </button>
      </Link>
    </>
  )}
</div>

</div>

</nav>



{/* HERO */}

<section className="relative min-h-[88vh] md:min-h-screen flex items-center justify-center text-center overflow-hidden pt-10 md:pt-14 pb-12 bg-slate-50 dark:bg-slate-950 transition-colors">

{/* LetterGlitch Background Component (ReactBits) - Adapts cleanly to light & dark mode */}
<div className="absolute inset-0 z-0 overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
  <LetterGlitch 
    glitchColors={
      theme === "dark"
        ? ['#ff7a00', '#f97316', '#38bdf8', '#00f0ff', '#10b981', '#60a5fa', '#94a3b8']
        : ['#ea580c', '#f97316', '#0284c7', '#0284c7', '#059669', '#3b82f6', '#475569']
    }
    glitchSpeed={45}
    centerVignette={false}
    outerVignette={false}
    smooth={true}
    className="opacity-90 dark:opacity-75"
  />

  {/* Ambient glow orbs */}
  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[320px] bg-gradient-to-r from-orange-500/20 dark:from-orange-500/25 via-amber-500/15 to-cyan-500/15 dark:to-cyan-500/20 rounded-full blur-[140px] pointer-events-none" />
  <div className="absolute -bottom-10 left-10 w-[300px] h-[300px] bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
  <div className="absolute -bottom-10 right-10 w-[300px] h-[300px] bg-orange-500/15 dark:bg-orange-500/20 rounded-full blur-[120px] pointer-events-none" />

  {/* Soft subtle radial overlay allowing bright glitch letters to shine through with backdrop-blur behind text */}
  <div className="absolute inset-0 bg-radial-[circle_at_center,_rgba(248,250,252,0.35)_0%,_rgba(248,250,252,0.75)_90%] dark:bg-radial-[circle_at_center,_rgba(2,6,23,0.40)_0%,_rgba(2,6,23,0.80)_90%] pointer-events-none transition-colors" />
  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50 dark:to-slate-950 pointer-events-none transition-colors" />
</div>

<div className="relative z-10 max-w-4xl px-6 flex flex-col items-center -translate-y-8 md:-translate-y-14">

<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-mono font-semibold text-xs tracking-[0.2em] uppercase mb-4 backdrop-blur-md shadow-sm hover:scale-105 hover:bg-orange-500/20 transition cursor-default">
  <Sparkles size={13} className="text-orange-500 dark:text-orange-400 animate-pulse" />
  <span>AI SECURITY PLATFORM</span>
</div>

<h1 className="text-6xl md:text-7xl font-black mt-2 leading-tight text-slate-950 dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-md">
Secure Your Code With
<span className="text-orange-500 cursor-pointer transition-all duration-300 hover:scale-105 inline-block hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-orange-500 hover:via-amber-400 hover:to-orange-500 drop-shadow-[0_0_25px_rgba(249,115,22,0.45)] dark:drop-shadow-[0_0_25px_rgba(249,115,22,0.75)]"> AURIX.</span>
</h1>

<p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl font-normal leading-relaxed">
  Autonomous agentic security platform that scans, identifies, and remediates vulnerabilities in your codebase before they reach production.
</p>

<div className="flex justify-center gap-4 mt-10">

<button
  onClick={handleScanNowClick}
  disabled={isLoading}
  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white dark:text-slate-950 font-black rounded-xl hover:scale-105 hover:from-orange-600 hover:to-amber-500 transition shadow-lg shadow-orange-500/25 cursor-pointer flex items-center gap-2 text-base disabled:opacity-70 disabled:cursor-wait"
>
  <span>{isLoading ? "Loading..." : "Start Scan Now"}</span>
  <ArrowRight size={18} />
</button>

</div>

</div>

</section>



{/* WORKFLOW */}

{/* WORKFLOW */}

<section 
  id="workflow" 
  className="py-32 bg-slate-100/70 dark:bg-slate-950/60 border-t border-b border-slate-200 dark:border-slate-900 relative overflow-hidden transition-colors"
>
  {/* Subtle ambient light behind title */}
  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[550px] h-[220px] bg-orange-500/10 blur-[130px] pointer-events-none" />

  <div className="text-center mb-20">

    {/* Interactive "How AURIX Works" title with stunning hover effect */}
    <div className="group inline-block cursor-pointer select-none">
      <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white transition-all duration-300">
        <span className="transition-colors duration-300 group-hover:text-slate-400">How </span>
        <span className="relative inline-block text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 group-hover:text-transparent group-hover:bg-clip-text hover:bg-gradient-to-r hover:from-orange-500 hover:via-amber-400 hover:to-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.4)] group-hover:drop-shadow-[0_0_40px_rgba(249,115,22,0.95)]">
          AURIX
          <span className="absolute -bottom-1.5 left-0 w-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full transition-all duration-500 ease-out group-hover:w-full shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
        </span>
        <span className="transition-colors duration-300 group-hover:text-slate-400"> Works</span>
      </h2>
    </div>

  </div>

<div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto px-6">

{workflow.map((step, i) => {

const Icon = step.icon
const isActive = activeStep === i

return (

<StarBorder
  key={i}
  isActive={isActive}
  color={isActive ? "#ff6b00" : "#38bdf8"}
  speed={isActive ? "2.5s" : "5s"}
  glow={true}
  onClick={() => setActiveStep(i)}
  className="w-full h-full text-center"
>
  <div className="p-8 h-full flex flex-col items-center justify-between relative overflow-hidden bg-white/95 dark:bg-slate-900/90 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800/80 transition-colors">
    {/* Top step badge */}
    <div className="flex items-center justify-between w-full mb-6">
      <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border transition-all duration-300 ${
        isActive
          ? "bg-orange-500 text-white dark:text-slate-950 border-orange-400 font-extrabold shadow-[0_0_12px_rgba(249,115,22,0.7)]"
          : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600"
      }`}>
        0{i + 1}
      </span>
      {isActive ? (
        <span className="text-[10px] font-mono uppercase tracking-wider text-orange-500 dark:text-orange-400 flex items-center gap-1 font-semibold animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Active
        </span>
      ) : (
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
          Click
        </span>
      )}
    </div>

    {/* Icon Container */}
    <div className={`w-16 h-16 mx-auto flex items-center justify-center rounded-2xl mb-6 transition-all duration-500 ${
      isActive
        ? "bg-orange-500/15 dark:bg-orange-500/20 scale-110 shadow-[0_0_25px_rgba(249,115,22,0.4)] border border-orange-500/40 dark:border-orange-500/50"
        : "bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 group-hover:scale-105 group-hover:border-slate-300 dark:group-hover:border-slate-700"
    }`}>
      <Icon className={isActive ? "text-orange-500 dark:text-orange-400" : "text-orange-500/80 group-hover:text-orange-500 dark:group-hover:text-orange-400"} size={30} />
    </div>

    <h3 className={`font-bold text-lg transition-colors duration-300 ${isActive ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white"}`}>
      {step.title}
    </h3>

    <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed font-sans">
      {step.desc}
    </p>

    {/* Synchronized Timer Progress Line for active card */}
    <div className="mt-6 w-full max-w-[130px] h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
      {isActive ? (
        <div 
          key={activeStep}
          className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-[workflowProgress_2.8s_linear_forwards]"
        />
      ) : (
        <div className="h-full w-0 bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-700 transition-all duration-300" />
      )}
    </div>
  </div>
</StarBorder>

)

})}

</div>

</section>

{/* Logo Loop Marquee Section (Below Workflow) */}
<section className="py-12 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900 w-full overflow-hidden transition-colors">
  <div className="w-full text-center">
    <LogoLoop 
      logos={securityTech}
      speed={60}
      direction="left"
      logoHeight={40}
      gap={80}
      fadeOut={true}
      width="100%"
      scaleOnHover={true}
    />
  </div>
</section>

{/* FEATURES */}

<section id="features" className="py-32 bg-slate-50 dark:bg-slate-950 relative transition-colors">

<div className="text-center mb-20">

<p className="text-orange-500 text-sm font-semibold tracking-wider font-mono">
CORE TECHNOLOGY
</p>

<h2 className="text-4xl font-black text-slate-900 dark:text-white mt-2">
Powerful Features
</h2>

</div>

<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto px-6">

{features.map((f, i) => {

const Icon = f.icon

return (

<div
key={i}
className="p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-2 transition duration-300 shadow-sm"
>

<div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
  <Icon className="text-orange-500 dark:text-orange-400" size={24} />
</div>

<h3 className="font-bold text-slate-900 dark:text-white text-lg">
{f.title}
</h3>

<p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
{f.desc}
</p>

</div>

)

})}

</div>

</section>



{/* SCAN OPTIONS */}

<section id="scan" className="py-32 bg-white dark:bg-slate-950/80 border-t border-b border-slate-200 dark:border-slate-900 transition-colors">

<div className="text-center mb-20">

<p className="text-orange-500 text-sm font-semibold tracking-wider font-mono">
SCAN OPTIONS
</p>

<h2 className="text-4xl font-black text-slate-900 dark:text-white mt-2">
Start Securing Your Code Today
</h2>

<p className="text-slate-600 dark:text-slate-400 mt-4">
Choose how you want to scan your project.
</p>

</div>

<div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto px-6">

{scanOptions.map((option, i) => {

const Icon = option.icon

return (

<div
key={i}
className="p-10 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-2 transition duration-300 text-center shadow-sm"
>

<div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-6">
  <Icon className="text-orange-500 dark:text-orange-400" size={32} />
</div>

<h3 className="font-bold text-slate-900 dark:text-white text-lg">
{option.title}
</h3>

<p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
{option.desc}
</p>

<Link href={scanTargetUrl}>
  <button className="mt-6 px-6 py-3 border border-orange-500/40 text-orange-600 dark:text-orange-400 hover:text-white dark:hover:text-slate-950 font-semibold rounded-lg hover:bg-orange-500 transition cursor-pointer">
    Start Scan
  </button>
</Link>

</div>

)

})}

</div>

</section>



{/* FOOTER */}

<footer className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 py-20 border-t border-slate-200 dark:border-slate-900 transition-colors">

<div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">

<div>

<h3 className="text-slate-900 dark:text-white text-xl font-bold mb-4">
AURIX<span className="text-orange-500">.</span>
</h3>

<p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
AI vulnerability detection platform helping developers identify
security risks in their code.
</p>

</div>


<div>

<h4 className="text-slate-900 dark:text-white font-semibold mb-4">
Quick Links
</h4>

<ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">

<li className="hover:text-orange-500 dark:hover:text-orange-400 transition cursor-pointer">Home</li>
<li className="hover:text-orange-500 dark:hover:text-orange-400 transition cursor-pointer">Workflow</li>
<li className="hover:text-orange-500 dark:hover:text-orange-400 transition cursor-pointer">Features</li>
<li className="hover:text-orange-500 dark:hover:text-orange-400 transition cursor-pointer">Scan</li>

</ul>

</div>


<div>

<h4 className="text-slate-900 dark:text-white font-semibold mb-4">
Platform
</h4>

<ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">

<li className="hover:text-orange-500 dark:hover:text-orange-400 transition cursor-pointer">Security Scan</li>
<li className="hover:text-orange-500 dark:hover:text-orange-400 transition cursor-pointer">AI Detection</li>
<li className="hover:text-orange-500 dark:hover:text-orange-400 transition cursor-pointer">Risk Heatmaps</li>
<li className="hover:text-orange-500 dark:hover:text-orange-400 transition cursor-pointer">Reports</li>

</ul>

</div>


<div>

<h4 className="text-slate-900 dark:text-white font-semibold mb-4">
Project Info
</h4>

<p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
Final Year Project<br />
AI Based Vulnerability Detection Platform
</p>

</div>

</div>

<div className="border-t border-slate-200 dark:border-slate-900 mt-16 pt-6 text-center text-sm text-slate-500">

© 2026 AURIX. All rights reserved.

</div>

</footer>


</main>

  )

}