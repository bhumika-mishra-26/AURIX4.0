import { authService } from "@/services/auth.service"

// Use relative /api/* paths so Next.js proxy (next.config.ts rewrites) forwards
// requests to the backend at localhost:5000 — avoids browser CORS issues.
// Only fall back to absolute URL for truly external endpoints.
function buildUrl(endpoint: string): string {
  if (endpoint.startsWith("http")) return endpoint
  // Normalize to always start with /
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL
  if (envUrl && envUrl.trim() !== "") {
    return `${envUrl.replace(/\/+$/, "")}${path}`
  }
  if (typeof window === "undefined") {
    return `http://localhost:5000${path}`
  }
  return path
}

export async function apiClient(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = authService.getToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const url = buildUrl(endpoint)

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    authService.setToken(null)
    authService.setUser(null)
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`)
  }

  return data
}

// Typed helpers for common backend resources

export const projectsApi = {
  list: () => apiClient("/api/projects"),
  create: (name: string, repository_url: string) =>
    apiClient("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name, repository_url }),
    }),
}

export const scansApi = {
  submitGithub: async (github_url: string, project_id?: string) => {
    let targetProjectId = project_id
    if (!targetProjectId) {
      try {
        const repoName = github_url.split("/").filter(Boolean).pop()?.replace(/\.git$/i, "") || "Scanned Project"
        const projRes = await projectsApi.create(repoName, github_url)
        if (projRes?.project?.id) {
          targetProjectId = projRes.project.id
        }
      } catch (e) {
        console.warn("Auto-project creation warning:", e)
      }
    }
    return apiClient("/api/scans/github", {
      method: "POST",
      body: JSON.stringify({ github_url, project_id: targetProjectId || "demo-project-id" }),
    })
  },

  submitZip: async (file: File, project_id?: string) => {
    let targetProjectId = project_id
    if (!targetProjectId) {
      try {
        const repoName = file.name.replace(/\.zip$/i, "") || "Uploaded Zip Project"
        const projRes = await projectsApi.create(repoName, `zip://${file.name}`)
        if (projRes?.project?.id) {
          targetProjectId = projRes.project.id
        }
      } catch (e) {
        console.warn("Auto-project creation warning for zip:", e)
      }
    }

    const token = authService.getToken()
    const form = new FormData()
    form.append("source_code", file)
    if (targetProjectId) {
      form.append("project_id", targetProjectId)
    }

    const url = buildUrl("/api/scans/upload")
    const response = await fetch(url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || `Upload failed with status ${response.status}`)
    }

    return data
  },

  getStatus: (scan_id: string) => apiClient(`/api/scans/${scan_id}`),
}
