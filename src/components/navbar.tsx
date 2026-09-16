"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import {
  ShieldCheck,
  LayoutDashboard,
  PlusCircle,
  History,
  Database,
  MessageSquare,
  LogOut,
  User as UserIcon,
  ChevronRight
} from "lucide-react"

interface NavbarProps {
  onOpenTutor?: () => void
  showTutorButton?: boolean
}

export default function Navbar({ onOpenTutor, showTutorButton = true }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navLinks = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard"
    },
    {
      name: "New Scan",
      href: "/scan",
      icon: PlusCircle,
      active: pathname === "/scan",
      highlight: true
    },
    {
      name: "History",
      href: "/history",
      icon: History,
      active: pathname === "/history"
    },
    {
      name: "Intelligence",
      href: "/results",
      icon: Database,
      active: pathname === "/results"
    }
  ]

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch {
      router.push("/login")
    }
  }

  const displayName = 
    user?.user_metadata?.user_name ||
    user?.user_metadata?.preferred_username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Agent"

  return (
    <header className="w-full border-b border-slate-200 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand + Nav Links */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden group-hover:scale-105 transition-transform flex items-center justify-center">
              <img src="/logo.png" alt="AURIX Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                AURIX<span className="text-orange-500">.</span>
              </span>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    item.active
                      ? "bg-orange-500/10 text-orange-500 font-bold border border-orange-500/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <Icon size={14} className={item.active ? "text-orange-500" : "text-slate-400"} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-3">
          {showTutorButton && onOpenTutor && (
            <button
              onClick={onOpenTutor}
              className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-orange-500/40 transition shadow-sm cursor-pointer"
              title="Open AURIX AI Tutor"
            >
              <MessageSquare size={13} className="text-orange-500" />
              <span className="hidden sm:inline">AURIX Tutor</span>
            </button>
          )}

          {/* Quick CTA to /scan if not on /scan */}
          {pathname !== "/scan" && (
            <Link
              href="/scan"
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:scale-[1.02] shadow shadow-orange-500/10 transition cursor-pointer"
            >
              <PlusCircle size={13} />
              <span>Launch Scan</span>
            </Link>
          )}

          {/* User Profile Badge & Logout (Client-only rendering after hydration) */}
          {mounted && user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
              <UserIcon size={12} className="text-orange-500" />
              <span className="truncate max-w-[120px] sm:max-w-[160px]" title={user.email || displayName}>
                {displayName}
              </span>
            </div>
          )}

          {/* Sign Out */}
          {mounted && user && (
            <button
              onClick={handleLogout}
              className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-500/30 transition shadow-sm cursor-pointer"
              title="Sign Out Session"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>

      </div>

      {/* Mobile Nav Row */}
      <div className="md:hidden flex items-center justify-around px-4 py-2 border-t border-slate-200 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/50 text-xs">
        {navLinks.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded font-medium ${
                item.active ? "text-orange-500 font-bold" : "text-slate-500 hover:text-slate-200"
              }`}
            >
              <Icon size={16} />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </header>
  )
}
