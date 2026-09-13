"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Github, Mail, Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react"
import { authService } from "@/services/auth.service"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/services/supabaseClient"

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [recoverySent, setRecoverySent] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const { sandboxLogin } = useAuth()

  // Handle OAuth callback or password recovery in hash/search
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#") ? window.location.hash.substring(1) : window.location.hash
      )

      const type = searchParams.get("type") || hashParams.get("type")
      const accessToken = searchParams.get("access_token") || hashParams.get("access_token")

      if (type === "recovery") {
        setIsResettingPassword(true)
        if (accessToken) {
          authService.setToken(accessToken)
        }
      } else if (accessToken) {
        authService.setToken(accessToken)
        router.push("/scan")
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsResettingPassword(true)
        if (session?.access_token) {
          authService.setToken(session.access_token)
        }
      }
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccessMessage("")

    if (!email || !password || (!isLogin && !name)) {
      setError("Please fill in all required fields.")
      setIsLoading(false)
      return
    }

    if (!isLogin && password.length < 6) {
      setError("Password must be at least 6 characters long.")
      setIsLoading(false)
      return
    }

    try {
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
      const destination = searchParams?.get("redirect") || "/scan"

      if (isLogin) {
        await authService.login(email, password)
        router.push(destination)
      } else {
        const res = await authService.signup(name, email, password)
        if (res.token) {
          router.push(destination)
        } else {
          setSuccessMessage(res.message || "Registration successful! Please sign in to continue.")
          setIsLogin(true)
        }
      }
    } catch (err: any) {
      const msg = err.message || ""
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("exists") ||
        msg.toLowerCase().includes("registered") ||
        msg.toLowerCase().includes("duplicate")
      ) {
        setError("An account with this email already exists. Please sign in instead.")
      } else {
        setError(msg || "Authentication failed. Please verify your credentials.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.")
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify.")
      setIsLoading(false)
      return
    }

    try {
      await authService.updatePassword(newPassword)
      setSuccessMessage("Password updated successfully! You can now sign in with your new password.")
      setIsResettingPassword(false)
      setIsLogin(true)
      setPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setError(err.message || "Failed to update password. The reset link may have expired.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!recoveryEmail) {
      setError("Please enter your email address.")
      setIsLoading(false)
      return
    }

    try {
      await authService.forgotPassword(recoveryEmail)
      setRecoverySent(true)
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGitHubLogin = async () => {
    try {
      setOauthLoading(true)
      setError("")

      // Sign out any existing Supabase session so GitHub shows fresh account picker
      await supabase.auth.signOut().catch(() => {})

      const redirectUrl = `${window.location.origin}/auth/callback`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: redirectUrl,
          scopes: "read:user user:email repo",
          // prompt=login forces GitHub to show account login/selection screen
          queryParams: {
            prompt: "login",
          },
        },
      })

      if (error) {
        throw error
      }

      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      console.error("GitHub OAuth error:", err)
      setError(err.message || "Failed to establish GitHub OAuth connection.")
      setOauthLoading(false)
    }
  }

  const handleAuthorizeSandbox = async () => {
    try {
      setOauthLoading(true)
      setError("")
      // Use AuthContext sandboxLogin so user state is set globally (visible on dashboard)
      await sandboxLogin("sandbox@aurix.io")
      await new Promise(r => setTimeout(r, 600))
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Sandbox authorization error:", err)
      setError(err.message || "Failed to establish sandbox session. Please try again.")
      setOauthLoading(false)
    }
  }


  return (
    <main className="min-h-screen relative flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Tech Theme Deco */}
      <div className="absolute inset-0 z-0">
        {/* Dark Grid */}
        <div 
          className="absolute inset-0 opacity-[0.08]" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px' 
          }} 
        />
        
        {/* Soft Glowing Ambient Orbs */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-orange-500/10 blur-[120px] animate-pulse duration-[10000ms]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse duration-[7000ms]" />
        
        {/* Tech Code Elements */}
        <div className="absolute top-10 left-10 font-mono text-[10px] text-slate-700 select-none hidden md:block">
          AURIX_SYSTEM_INIT // OK<br />
          SECURE_PORT_ACTIVE // 443<br />
          SHIELD_STATUS // ENFORCED
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md p-1 px-4">
        {/* Header / Brand logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 text-slate-950 font-bold shadow-lg shadow-orange-500/25">
              <ShieldCheck size={28} />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              AURIX<span className="text-orange-500">.</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">
            Agentic Unified Risk Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div className="w-full bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden shadow-black/50">
          
          {isResettingPassword ? (
            <div className="p-8">
              <h2 className="text-xl font-bold text-white mb-2">Set New Password</h2>
              <p className="text-xs text-slate-400 mb-6 font-sans">
                Enter your new secure password below to restore access to your account.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-12 py-3 bg-slate-950/50 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg text-slate-200 placeholder-slate-600 text-sm outline-none transition duration-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg text-slate-200 placeholder-slate-600 text-sm outline-none transition duration-200"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-lg shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 hover:scale-[1.01] transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Save New Password
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsResettingPassword(false)
                    setIsLogin(true)
                    setError("")
                  }}
                  className="w-full py-3 bg-transparent border border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Return to Sign In
                </button>
              </form>
            </div>
          ) : isForgotPassword ? (
            <div className="p-8">
              {recoverySent ? (
                <div className="space-y-6 text-center">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                    <Mail size={28} />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Check Your Email</h2>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                      We have sent a password reset link to:
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-sm font-medium text-orange-400 font-mono select-all">
                      {recoveryEmail}
                    </div>
                    <p className="text-[11px] text-slate-500 pt-2 leading-relaxed">
                      Click the link in the email to set a new password. If you don't see it, please check your spam or junk folder.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setRecoverySent(false);
                        setRecoveryEmail("");
                        setError("");
                      }}
                      className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-lg shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 hover:scale-[1.01] transition duration-200 text-sm font-semibold cursor-pointer"
                    >
                      Back to Sign In
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRecoverySent(false);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 transition underline underline-offset-4 cursor-pointer"
                    >
                      Didn't receive the email? Try again
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-2">Forgot Password?</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Enter your registered email address below and we'll send you a link to reset your password.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Email Address</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                          <Mail size={16} />
                        </span>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg text-slate-200 placeholder-slate-600 text-sm outline-none transition duration-200"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-lg shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 hover:scale-[1.01] transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Send Reset Link
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setError("");
                      }}
                      className="w-full py-3 bg-transparent border border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      Cancel and Return to Sign In
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => { setIsLogin(true); setError(""); }}
                  className={`flex-1 py-4 text-center text-sm font-semibold tracking-wide transition duration-300 ${
                    isLogin 
                      ? "text-orange-500 border-b-2 border-orange-500 bg-slate-900/40" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setIsLogin(false); setError(""); }}
                  className={`flex-1 py-4 text-center text-sm font-semibold tracking-wide transition duration-300 ${
                    !isLogin 
                      ? "text-orange-500 border-b-2 border-orange-500 bg-slate-900/40" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <div className="p-8">
                <h2 className="text-xl font-bold text-white mb-2">
                  {isLogin ? "Sign In to AURIX Platform" : "Create Account"}
                </h2>
                <p className="text-xs text-slate-400 mb-6">
                  {isLogin 
                    ? "Enter your registered credentials to access the risk intelligence portal." 
                    : "Create an account to configure automated vulnerability scanning and remediation features."}
                </p>

                {error && (
                  <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      <span>{error}</span>
                    </div>
                    {!isLogin && error.toLowerCase().includes("already") && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(true)
                          setError("")
                        }}
                        className="text-left text-[11px] text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2 ml-3.5 cursor-pointer"
                      >
                        Switch to Sign In with this email →
                      </button>
                    )}
                  </div>
                )}

                {successMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}


                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Full Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                          <User size={16} />
                        </span>
                        <input
                          type="text"
                          placeholder="Security Auditor"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoComplete="name"
                          className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg text-slate-200 placeholder-slate-600 text-sm outline-none transition duration-200"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        placeholder="agent@aurix.io"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg text-slate-200 placeholder-slate-600 text-sm outline-none transition duration-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Password</label>
                      {isLogin && (
                        <span 
                          onClick={() => { setIsForgotPassword(true); setError(""); }}
                          className="text-[10px] text-orange-500/80 hover:text-orange-500 cursor-pointer font-medium transition"
                        >
                          Forgot?
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        className="w-full pl-10 pr-12 py-3 bg-slate-950/50 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg text-slate-200 placeholder-slate-600 text-sm outline-none transition duration-200"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded accent-orange-500 bg-slate-900 border-slate-700 cursor-pointer focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-xs text-slate-400 hover:text-slate-300 transition">
                        {isLogin ? "Keep me authenticated" : "I agree to Terms & Conditions"}
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-lg shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 hover:scale-[1.01] transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {isLogin ? "Initialize Session" : "Create Account"}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-3 text-slate-500 font-mono">Secure Access Gate</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleGitHubLogin}
                  disabled={oauthLoading}
                  className="w-full flex items-center justify-center gap-2 border border-slate-800 bg-slate-950/20 hover:bg-slate-950/50 hover:border-slate-700 py-3.5 rounded-lg text-sm text-slate-300 font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <Github size={18} />
                  {oauthLoading ? "Connecting to GitHub..." : "Continue with GitHub"}
                </button>

                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError("")
                      setShowOAuthModal(true)
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-400 transition underline underline-offset-4 font-mono cursor-pointer"
                  >
                    Or open Sandbox Demo Mode
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Security Footer Note */}
        <div className="text-center mt-6 text-[10px] text-slate-600 font-mono">
          SECURED BY end-to-end aes-256 cryptosystem // session id: 0x932fa...
        </div>
      </div>

      {/* Simulated GitHub OAuth Modal */}
      {showOAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
              <div className="flex items-center gap-2 text-white">
                <Github size={20} />
                <span className="text-sm font-semibold">GitHub Authorization Gate</span>
              </div>
              <button 
                onClick={() => setShowOAuthModal(false)}
                className="text-[#8b949e] hover:text-white text-xs font-mono"
              >
                ESC
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-orange-500 border border-slate-700 shadow-md">
                  <ShieldCheck size={24} />
                </div>
                <div className="text-[#8b949e] font-mono text-sm font-bold animate-pulse">⟷</div>
                <div className="w-12 h-12 rounded-full bg-[#24292f] flex items-center justify-center text-white border border-[#30363d] shadow-md">
                  <Github size={24} />
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-white">Authorize AURIX Risk Intelligence</h3>
                <p className="text-xs text-[#8b949e]">
                  Requesting access to verify code posture and automate patch remediations.
                </p>
              </div>

              {/* Scopes Requested */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3 text-xs text-[#c9d1d9] font-mono">
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <div>
                    <div className="font-semibold text-white">public_profile & user:email</div>
                    <div className="text-[10px] text-[#8b949e] mt-0.5">Read basic account metadata</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <div>
                    <div className="font-semibold text-white">repo (Full Scope)</div>
                    <div className="text-[10px] text-[#8b949e] mt-0.5">Automate Blue Agent PR patches on sandbox</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <div>
                    <div className="font-semibold text-white">write:packages</div>
                    <div className="text-[10px] text-[#8b949e] mt-0.5">Verify patched Docker container integrity</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {error}
                  </div>
                )}
                {oauthLoading ? (
                  <button
                    disabled
                    className="w-full py-3 bg-[#2ea44f]/60 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting to GitHub...
                  </button>
                ) : (
                  <button
                    onClick={handleGitHubLogin}
                    className="w-full py-3 bg-[#2ea44f] hover:bg-[#2c974b] text-white font-semibold rounded-lg text-sm transition duration-150 cursor-pointer text-center flex items-center justify-center gap-2"
                  >
                    <Github size={16} />
                    Authorize Real GitHub Account
                  </button>
                )}
                <button
                  type="button"
                  disabled={oauthLoading}
                  onClick={handleAuthorizeSandbox}
                  className="w-full py-2.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white border border-[#30363d] rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Launch Demo Sandbox (sandbox@aurix.io)
                </button>
                <button
                  type="button"
                  disabled={oauthLoading}
                  onClick={() => setShowOAuthModal(false)}
                  className="w-full py-2.5 bg-transparent border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancel Authorization
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#161b22] border-t border-[#30363d] text-[10px] text-[#8b949e] text-center font-mono leading-relaxed">
              Target sandbox connection is encrypted via TLS 1.3 // redirecting to app.aurix.io/oauth/callback
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
