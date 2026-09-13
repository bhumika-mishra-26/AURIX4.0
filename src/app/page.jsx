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
  Sparkles
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"



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
  const [activeStep, setActiveStep] = useState(0)

  // If already logged in, go to /scan; otherwise open login/signup page with return redirect
  const scanTargetUrl = (isAuthenticated || user) ? "/scan" : "/login?redirect=/scan"

  const handleScanNowClick = () => {
    // Wait for auth to resolve — if authenticated go to scan, else go to login
    if (isAuthenticated || user) {
      router.push("/scan")
    } else {
      router.push("/login?redirect=/scan")
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

  // Enforce permanent dark theme
  useEffect(() => {
    document.documentElement.classList.add("dark")
    document.documentElement.classList.remove("light")
    if (typeof window !== "undefined") {
      localStorage.setItem("aurix_theme", "dark")
    }
  }, [])

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

    <main className="bg-slate-950 text-slate-100 min-h-screen">

{/* NAVBAR */}

<nav className="fixed top-0 w-full backdrop-blur bg-slate-950/80 border-none z-50">

<div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">

<div className="flex items-center gap-2 group cursor-pointer">
  <ShieldCheck className="text-orange-500 group-hover:rotate-12 transition-transform" size={28} />
  <h1 className="font-bold text-2xl tracking-tight text-white">
    AURIX<span className="text-orange-500">.</span>
  </h1>
</div>

<div className="hidden md:flex gap-8 text-sm font-medium text-slate-300">

<a href="#" className="hover:text-orange-500 transition">Home</a>
<a href="#workflow" className="hover:text-orange-500 transition">Workflow</a>
<a href="#features" className="hover:text-orange-500 transition">Features</a>
<a href="#scan" className="hover:text-orange-500 transition">Scan</a>

</div>

<div className="flex items-center gap-4">
  <Link href="/login">
    <button className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition shadow-md shadow-orange-500/10 cursor-pointer">
      Log in
    </button>
  </Link>
  <Link href="/login">
    <button className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition shadow-md shadow-orange-500/10 cursor-pointer">
      Sign up
    </button>
  </Link>
</div>

</div>

</nav>



{/* HERO */}

<section className="relative min-h-[88vh] md:min-h-screen flex items-center justify-center text-center overflow-hidden pt-10 md:pt-14 pb-12 bg-slate-950">

{/* LetterGlitch Background Component (ReactBits) - Balanced Cyber Glow */}
<div className="absolute inset-0 z-0 overflow-hidden">
  <LetterGlitch 
    glitchColors={['#ea580c', '#f97316', '#38bdf8', '#0ea5e9', '#10b981', '#94a3b8', '#f59e0b']}
    glitchSpeed={45}
    centerVignette={false}
    outerVignette={false}
    smooth={true}
  />

  {/* Soft ambient glow orbs with balanced intensity */}
  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[320px] bg-gradient-to-r from-orange-500/12 via-amber-500/8 to-cyan-500/12 rounded-full blur-[140px] pointer-events-none" />
  <div className="absolute -bottom-10 left-10 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
  <div className="absolute -bottom-10 right-10 w-[300px] h-[300px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

  {/* Refined gradient overlay: nicely visible without being blindingly bright */}
  <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/15 to-slate-950 pointer-events-none" />
  <div className="absolute inset-0 bg-radial-[circle_at_center,_transparent_35%,_rgba(2,6,23,0.65)_100%] pointer-events-none" />
</div>

<div className="relative z-10 max-w-4xl px-6 flex flex-col items-center -translate-y-8 md:-translate-y-14">

<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-mono font-semibold text-xs tracking-[0.2em] uppercase mb-4 backdrop-blur-md shadow-sm hover:scale-105 hover:bg-orange-500/25 transition cursor-default">
  <Sparkles size={13} className="text-orange-400 animate-pulse" />
  <span>AI SECURITY PLATFORM</span>
</div>

<h1 className="text-6xl md:text-7xl font-black mt-2 leading-tight text-white tracking-tight">
Secure Your Code With
<span className="text-orange-500 cursor-pointer transition-all duration-300 hover:scale-105 inline-block hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-orange-400 hover:via-amber-300 hover:to-orange-500 drop-shadow-[0_0_25px_rgba(249,115,22,0.75)] hover:drop-shadow-[0_0_45px_rgba(249,115,22,1)]"> AURIX.</span>
</h1>

<div className="flex justify-center gap-4 mt-10">

<button
  onClick={handleScanNowClick}
  disabled={isLoading}
  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black rounded-xl hover:scale-105 hover:from-orange-400 hover:to-amber-400 transition shadow-lg shadow-orange-500/25 cursor-pointer flex items-center gap-2 text-base disabled:opacity-70 disabled:cursor-wait"
>
  <span>{isLoading ? "Loading..." : "Start Scan Now"}</span>
  <ArrowRight size={18} />
</button>

</div>

</div>

</section>



{/* WORKFLOW */}

<section 
  id="workflow" 
  className="py-32 bg-slate-950/60 dark:bg-slate-950 border-t border-b border-slate-900 relative overflow-hidden"
>
  {/* Subtle ambient light behind title */}
  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[550px] h-[220px] bg-orange-500/10 blur-[130px] pointer-events-none" />

  <div className="text-center mb-20">

    {/* Interactive "How AURIX Works" title with stunning hover effect */}
    <div className="group inline-block cursor-pointer select-none">
      <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white transition-all duration-300">
        <span className="transition-colors duration-300 group-hover:text-slate-300">How </span>
        <span className="relative inline-block text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-400 group-hover:via-amber-300 group-hover:to-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.4)] group-hover:drop-shadow-[0_0_40px_rgba(249,115,22,0.95)]">
          AURIX
          <span className="absolute -bottom-1.5 left-0 w-0 h-1 bg-gradient-to-r from-orange-500 via-amber-300 to-orange-500 rounded-full transition-all duration-500 ease-out group-hover:w-full shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
        </span>
        <span className="transition-colors duration-300 group-hover:text-slate-300"> Works</span>
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
  <div className="p-8 h-full flex flex-col items-center justify-between relative overflow-hidden">
    {/* Top step badge */}
    <div className="flex items-center justify-between w-full mb-6">
      <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border transition-all duration-300 ${
        isActive
          ? "bg-orange-500 text-slate-950 border-orange-400 font-extrabold shadow-[0_0_12px_rgba(249,115,22,0.7)]"
          : "bg-slate-800/80 text-slate-400 border-slate-700 group-hover:border-slate-600"
      }`}>
        0{i + 1}
      </span>
      {isActive ? (
        <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 flex items-center gap-1 font-semibold animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Active
        </span>
      ) : (
        <span className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
          Click
        </span>
      )}
    </div>

    {/* Icon Container */}
    <div className={`w-16 h-16 mx-auto flex items-center justify-center rounded-2xl mb-6 transition-all duration-500 ${
      isActive
        ? "bg-orange-500/20 scale-110 shadow-[0_0_25px_rgba(249,115,22,0.4)] border border-orange-500/50"
        : "bg-slate-800/60 border border-slate-700/60 group-hover:scale-105 group-hover:bg-slate-800"
    }`}>
      <Icon className={isActive ? "text-orange-400" : "text-orange-500/80 group-hover:text-orange-400"} size={30} />
    </div>

    <h3 className={`font-bold text-lg transition-colors duration-300 ${isActive ? "text-white" : "text-slate-200 group-hover:text-white"}`}>
      {step.title}
    </h3>

    <p className="text-sm text-slate-400 mt-3 leading-relaxed font-sans">
      {step.desc}
    </p>

    {/* Synchronized Timer Progress Line for active card */}
    <div className="mt-6 w-full max-w-[130px] h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
      {isActive ? (
        <div 
          key={activeStep}
          className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-[workflowProgress_2.8s_linear_forwards]"
        />
      ) : (
        <div className="h-full w-0 bg-transparent group-hover:bg-slate-700 transition-all duration-300" />
      )}
    </div>
  </div>
</StarBorder>

)

})}

</div>

</section>

{/* Logo Loop Marquee Section (Below Workflow) */}
<section className="py-12 bg-slate-950 border-b border-slate-900 w-full overflow-hidden">
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

<section id="features" className="py-32 bg-slate-950">

<div className="text-center mb-20">

<p className="text-orange-500 text-sm font-semibold tracking-wider font-mono">
CORE TECHNOLOGY
</p>

<h2 className="text-4xl font-black text-white mt-2">
Powerful Features
</h2>

</div>

<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto px-6">

{features.map((f, i) => {

const Icon = f.icon

return (

<div
key={i}
className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-2 transition duration-300"
>

<Icon className="text-orange-500 mb-4" />

<h3 className="font-bold text-white text-lg">
{f.title}
</h3>

<p className="text-sm text-slate-400 mt-2 leading-relaxed">
{f.desc}
</p>

</div>

)

})}

</div>

</section>



{/* SCAN OPTIONS */}

<section id="scan" className="py-32 bg-slate-900/40 border-t border-b border-slate-850">

<div className="text-center mb-20">

<p className="text-orange-500 text-sm font-semibold tracking-wider font-mono">
SCAN OPTIONS
</p>

<h2 className="text-4xl font-black text-white mt-2">
Start Securing Your Code Today
</h2>

<p className="text-slate-400 mt-4">
Choose how you want to scan your project.
</p>

</div>

<div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto px-6">

{scanOptions.map((option, i) => {

const Icon = option.icon

return (

<div
key={i}
className="p-10 rounded-2xl bg-slate-950 border border-slate-800 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-2 transition duration-300 text-center"
>

<Icon className="mx-auto text-orange-500 mb-6" size={40} />

<h3 className="font-bold text-white text-lg">
{option.title}
</h3>

<p className="text-sm text-slate-400 mt-2 leading-relaxed">
{option.desc}
</p>

<Link href={scanTargetUrl}>
  <button className="mt-6 px-6 py-3 border border-orange-500/30 text-orange-400 font-semibold rounded-lg hover:bg-orange-500 hover:text-white transition cursor-pointer">
    Start Scan
  </button>
</Link>

</div>

)

})}

</div>

</section>



{/* FOOTER */}

<footer className="bg-slate-900 text-gray-300 py-20">

<div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">

<div>

<h3 className="text-white text-xl font-bold mb-4">
AURIX
</h3>

<p className="text-sm text-gray-400">
AI vulnerability detection platform helping developers identify
security risks in their code.
</p>

</div>


<div>

<h4 className="text-white font-semibold mb-4">
Quick Links
</h4>

<ul className="space-y-2 text-sm">

<li>Home</li>
<li>Workflow</li>
<li>Features</li>
<li>Scan</li>

</ul>

</div>


<div>

<h4 className="text-white font-semibold mb-4">
Platform
</h4>

<ul className="space-y-2 text-sm">

<li>Security Scan</li>
<li>AI Detection</li>
<li>Risk Heatmaps</li>
<li>Reports</li>

</ul>

</div>


<div>

<h4 className="text-white font-semibold mb-4">
Project Info
</h4>

<p className="text-sm text-gray-400">
Final Year Project  
AI Based Vulnerability Detection Platform
</p>

</div>

</div>

<div className="border-t border-gray-700 mt-16 pt-6 text-center text-sm text-gray-500">

© 2026 AURIX. All rights reserved.

</div>

</footer>


</main>

  )

}