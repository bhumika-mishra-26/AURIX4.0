"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  // On mount, read persisted preference (default to dark if none stored)
  useEffect(() => {
    const stored = localStorage.getItem("aurix_theme") as Theme | null
    const preferred = stored || "dark"
    setThemeState(preferred)
    applyTheme(preferred)
    setMounted(true)
  }, [])

  const applyTheme = (t: Theme) => {
    const root = document.documentElement
    if (t === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
      root.style.colorScheme = "dark"
    } else {
      root.classList.add("light")
      root.classList.remove("dark")
      root.style.colorScheme = "light"
    }
  }

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem("aurix_theme", t)
    applyTheme(t)
  }

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
