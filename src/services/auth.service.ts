// Base URL helper: reads NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL for production (e.g. Render/Vercel)
// Falls back to relative paths in browser (via next.config.ts rewrites) or localhost:5000 in SSR.
const getBase = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.replace(/\/+$/, "");
  }
  return typeof window === "undefined" ? "http://localhost:5000" : "";
};

// Safe JSON parser that avoids "Unexpected token 'T', 'The page c'... is not valid JSON"
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) {
      throw new Error(
        `Backend unreachable or returned HTTP ${res.status}. Please check your backend URL and status.`
      );
    }
    throw new Error("Invalid response format received from server.");
  }
}

export interface UserProfile {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface AuthResponse {
  message?: string;
  user?: UserProfile;
  session?: any;
  token?: string | null;
  error?: string;
}

export const authService = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("aurix_token");
  },

  setToken(token: string | null): void {
    if (typeof window === "undefined") return;
    if (token) {
      localStorage.setItem("aurix_token", token);
    } else {
      localStorage.removeItem("aurix_token");
    }
  },

  getUser(): UserProfile | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("aurix_user");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  setUser(user: UserProfile | null): void {
    if (typeof window === "undefined") return;
    if (user) {
      localStorage.setItem("aurix_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("aurix_user");
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${getBase()}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      throw new Error(data.error || "Failed to sign in. Please verify your credentials.");
    }

    if (data.token) {
      this.setToken(data.token);
    }
    if (data.user) {
      this.setUser(data.user);
    }

    return data;
  },

  async signup(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${getBase()}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      throw new Error(data.error || "Registration failed. Please check the provided details.");
    }

    if (data.token) {
      this.setToken(data.token);
    }
    if (data.user) {
      this.setUser(data.user);
    }

    return data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const res = await fetch(`${getBase()}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await safeJson(res);
      if (res.ok) {
        return data;
      }
    } catch (e) {
      console.warn("Backend forgot-password error, trying client Supabase:", e);
    }

    // Direct fallback to Supabase client
    try {
      const { supabase } = await import("./supabaseClient");
      const redirectOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectOrigin}/login?type=recovery`,
      });
      if (error) throw error;
      return { message: "Password reset link sent to your email." };
    } catch (err: any) {
      throw new Error(err.message || "Failed to initiate password recovery.");
    }
  },

  async updatePassword(password: string): Promise<{ message: string }> {
    // 1. Try Supabase client-side first
    try {
      const { supabase } = await import("./supabaseClient");
      const { data, error } = await supabase.auth.updateUser({ password });
      if (!error && data?.user) {
        return { message: "Password updated successfully." };
      }
      if (error) {
        console.warn("Supabase updateUser notice, trying backend endpoint:", error.message);
      }
    } catch (e) {
      console.warn("Supabase direct update error:", e);
    }

    // 2. Fallback to backend reset-password endpoint
    const token = this.getToken();
    const res = await fetch(`${getBase()}/api/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ password }),
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || "Failed to update password.");
    }

    return data;
  },

  async getGitHubOAuthUrl(): Promise<string> {
    const redirectOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const res = await fetch(
      `${getBase()}/api/auth/github?redirectTo=${encodeURIComponent(`${redirectOrigin}/auth/callback`)}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await safeJson(res);

    if (!res.ok || !data.url) {
      throw new Error(data.error || "Failed to generate GitHub OAuth URL");
    }

    return data.url;
  },

  async sandboxLogin(email: string = "sandbox@aurix.io"): Promise<AuthResponse> {
    const res = await fetch(`${getBase()}/api/auth/sandbox`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await safeJson(res);

    if (!res.ok || !data.token) {
      throw new Error(data.error || "Failed to authorize AURIX Sandbox session.");
    }

    if (data.token) {
      this.setToken(data.token);
    }
    if (data.user) {
      this.setUser(data.user);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("aurix_github_connected", "true");
      if (data.github_token) {
        localStorage.setItem("aurix_github_token", data.github_token);
      }
    }

    return data;
  },

  async getProfile(): Promise<UserProfile> {
    const token = this.getToken();
    if (!token) throw new Error("No authentication token found.");

    const res = await fetch(`${getBase()}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await safeJson(res);

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch user profile.");
    }

    if (data.user) {
      this.setUser(data.user);
    }

    return data.user;
  },

  async logout(): Promise<void> {
    const token = this.getToken();
    try {
      if (token) {
        await fetch(`${getBase()}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      this.setToken(null);
      this.setUser(null);
    }
  },
};
