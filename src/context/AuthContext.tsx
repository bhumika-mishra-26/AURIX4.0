"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService, UserProfile } from "@/services/auth.service"
import { supabase } from "@/services/supabaseClient"

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<any>
  signup: (name: string, email: string, password: string) => Promise<any>
  forgotPassword: (email: string) => Promise<any>
  loginWithGitHub: () => Promise<void>
  sandboxLogin: (email?: string) => Promise<any>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  // Seed state synchronously from localStorage to prevent blank flash on client-side navigation
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      return authService.getUser()
    }
    return null
  })
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return authService.getToken()
    }
    return null
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Initialize from localStorage and listen to Supabase Auth session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = authService.getToken()
        const storedUser = authService.getUser()

        if (storedToken) {
          setToken(storedToken)
          if (storedUser) {
            setUser(storedUser)
          } else {
            try {
              const profile = await authService.getProfile()
              setUser(profile)
            } catch {
              // Token might be invalid
            }
          }
        }

        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname
          const hash = window.location.hash ? window.location.hash.substring(1) : ""
          const search = window.location.search ? window.location.search.substring(1) : ""
          const hashParams = new URLSearchParams(hash)
          const searchParams = new URLSearchParams(search)

          const accessToken = hashParams.get("access_token") || searchParams.get("access_token")
          const type = hashParams.get("type") || searchParams.get("type")

          if (accessToken) {
            authService.setToken(accessToken)
            setToken(accessToken)
            try {
              const profile = await authService.getProfile()
              setUser(profile)
            } catch {
              // Ignore
            }

            if (type !== "recovery") {
              window.history.replaceState(null, "", window.location.pathname)
              if (currentPath === "/" || currentPath === "/login" || currentPath === "/auth/callback") {
                router.push("/dashboard")
                return
              }
            }
          }

          // Handle Supabase PKCE session exchange or existing session
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            authService.setToken(session.access_token)
            authService.setUser(session.user as any)
            setToken(session.access_token)
            setUser(session.user as any)

            if (type === "recovery") {
              return
            }

            if (type === "signup" || searchParams.has("code") || accessToken) {
              if (currentPath === "/" || currentPath === "/login" || currentPath === "/auth/callback") {
                router.push("/dashboard")
                return
              }
            }
          }
        }

        // Also sync with Supabase client listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
              // Let user stay on recovery form to enter new password
              return
            }

            if (session?.access_token) {
              authService.setToken(session.access_token)
              authService.setUser(session.user as any)
              setToken(session.access_token)
              setUser(session.user as any)

              if (typeof window !== "undefined") {
                const currentPath = window.location.pathname
                if (event === "SIGNED_IN" || event === "USER_UPDATED") {
                  if (currentPath === "/" || currentPath === "/login" || currentPath === "/auth/callback") {
                    router.push("/dashboard")
                  }
                }
              }
            } else if (event === "SIGNED_OUT") {
              authService.setToken(null)
              authService.setUser(null)
              setToken(null)
              setUser(null)
            }
          }
        )

        return () => {
          authListener?.subscription?.unsubscribe()
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [router])


  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password)
    if (res.token) setToken(res.token)
    if (res.user) setUser(res.user)
    return res
  }

  const signup = async (name: string, email: string, password: string) => {
    const res = await authService.signup(name, email, password)
    if (res.token) setToken(res.token)
    if (res.user) setUser(res.user)
    return res
  }

  const forgotPassword = async (email: string) => {
    return await authService.forgotPassword(email)
  }

  const sandboxLogin = async (email?: string) => {
    const res = await authService.sandboxLogin(email)
    if (res.token) setToken(res.token)
    if (res.user) setUser(res.user)
    return res
  }

  const loginWithGitHub = async () => {
    try {
      // Sign out existing session first so GitHub shows fresh account picker
      await supabase.auth.signOut().catch(() => {})

      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : "http://localhost:3000/auth/callback"

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: redirectUrl,
          scopes: "read:user user:email repo",
          queryParams: {
            prompt: "login",
          },
        },
      })

      if (error) throw error
      if (data?.url) {
        window.location.href = data.url
        return
      }
    } catch (supabaseErr) {
      console.warn("Direct Supabase OAuth error, attempting backend fallback:", supabaseErr)
      try {
        const url = await authService.getGitHubOAuthUrl()
        window.location.href = url
        return
      } catch (backendErr) {
        console.warn("Backend OAuth error, falling back to sandbox demo:", backendErr)
        await sandboxLogin()
        window.location.href = "/scan"
      }
    }
  }

  const logout = async () => {
    await authService.logout()
    await supabase.auth.signOut().catch(() => {})
    setToken(null)
    setUser(null)
    // Clear all aurix-related localStorage keys to prevent stale data across sessions
    if (typeof window !== "undefined") {
      localStorage.removeItem("aurix_token")
      localStorage.removeItem("aurix_user")
      localStorage.removeItem("aurix_github_token")
      localStorage.removeItem("aurix_github_connected")
      localStorage.removeItem("aurix_repo_url")
    }
  }

  const refreshUser = async () => {
    try {
      const profile = await authService.getProfile()
      setUser(profile)
    } catch {
      // Ignore
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        signup,
        forgotPassword,
        loginWithGitHub,
        sandboxLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
