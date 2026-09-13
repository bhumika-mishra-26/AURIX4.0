"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/services/supabaseClient"
import { authService } from "@/services/auth.service"
import { ShieldCheck } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (typeof window !== "undefined") {
          const searchParams = new URLSearchParams(window.location.search)
          const hash = window.location.hash ? window.location.hash.substring(1) : ""
          const hashParams = new URLSearchParams(hash)

          // 1. Check if OAuth error was returned
          const errorDesc =
            searchParams.get("error_description") ||
            searchParams.get("error") ||
            hashParams.get("error_description") ||
            hashParams.get("error")

          if (errorDesc) {
            console.error("OAuth provider error:", errorDesc)
            window.location.href = `/login?error=${encodeURIComponent(errorDesc)}`
            return
          }

          let sessionData: any = null

          // 2. PKCE code exchange
          const code = searchParams.get("code")
          if (code) {
            try {
              const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(code)
              if (codeData?.session) {
                sessionData = codeData.session
              } else if (codeErr) {
                console.warn("exchangeCodeForSession notice:", codeErr.message)
              }
            } catch (e) {
              console.warn("PKCE code exchange caught:", e)
            }
          }

          // 3. Hash parameters (implicit flow token)
          const accessToken = hashParams.get("access_token")
          if (accessToken) {
            authService.setToken(accessToken)
            localStorage.setItem("aurix_github_connected", "true")
          }

          // 4. Session check from Supabase client (fallback if auto-detected)
          if (!sessionData) {
            const { data: sessionRes } = await supabase.auth.getSession()
            if (sessionRes?.session) {
              sessionData = sessionRes.session
            }
          }

          if (sessionData) {
            authService.setToken(sessionData.access_token)
            authService.setUser(sessionData.user as any)
            localStorage.setItem("aurix_github_connected", "true")
            if (sessionData.provider_token) {
              localStorage.setItem("aurix_github_token", sessionData.provider_token)
            }
          }

          // Navigate cleanly using window.location to ensure RootLayout AuthProvider re-syncs state
          window.location.href = "/scan"
          return
        }
      } catch (err: any) {
        console.error("Callback verification error:", err)
        window.location.href = "/login"
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans space-y-4">
      <div className="p-3 rounded-xl bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20 animate-pulse">
        <ShieldCheck size={32} />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold">Verifying Credentials...</h2>
        <p className="text-xs text-slate-400 font-mono">Finalizing handshake with AURIX Vault</p>
      </div>
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mt-2" />
    </div>
  )
}
