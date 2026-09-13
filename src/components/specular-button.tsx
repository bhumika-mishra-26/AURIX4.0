"use client"

import React, { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface SpecularButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
  glowColor?: string
  specularColor?: string
  variant?: "orange" | "blue" | "emerald" | "slate" | "outline"
  size?: "sm" | "md" | "lg" | "xl"
  disabled?: boolean
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function SpecularButton({
  children,
  className = "",
  glowColor = "#f97316",
  specularColor = "rgba(255, 255, 255, 0.9)",
  variant = "orange",
  size = "md",
  disabled = false,
  onClick,
  ...props
}: SpecularButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePos({ x, y })
  }

  const variantStyles = {
    orange: "bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 text-white shadow-orange-500/25 border-orange-400/40",
    blue: "bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 text-white shadow-blue-500/25 border-blue-400/40",
    emerald: "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 text-white shadow-emerald-500/25 border-emerald-400/40",
    slate: "bg-slate-900 dark:bg-slate-800 text-slate-100 shadow-slate-950/40 border-slate-700/60",
    outline: "bg-slate-900/60 backdrop-blur-md text-orange-400 border-orange-500/40 hover:border-orange-500 shadow-orange-500/10"
  }

  const sizeStyles = {
    sm: "px-4 py-2 text-xs rounded-lg gap-1.5",
    md: "px-6 py-2.5 text-sm font-semibold rounded-xl gap-2",
    lg: "px-8 py-3.5 text-base font-bold rounded-xl gap-2.5",
    xl: "px-10 py-4 text-lg font-extrabold rounded-2xl gap-3"
  }

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative group inline-flex items-center justify-center overflow-hidden transition-all duration-300 transform active:scale-95 cursor-pointer shadow-lg border backdrop-blur-sm select-none",
        variantStyles[variant],
        sizeStyles[size],
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      {/* Dynamic Specular Light Rim Gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, ${glowColor}33, transparent 40%)`
        }}
      />

      {/* High-Gloss Specular Rim Reflection Highlight */}
      <div
        className="absolute -inset-[1px] rounded-[inherit] pointer-events-none transition-opacity duration-300 opacity-70 group-hover:opacity-100"
        style={{
          background: `radial-gradient(180px circle at ${mousePos.x}% ${mousePos.y}%, ${specularColor}, transparent 60%)`,
          maskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1.5px"
        }}
      />

      {/* Internal Metallic Specular Sheen Sweep */}
      <div
        className={cn(
          "absolute top-0 left-[-100%] w-[50%] h-full pointer-events-none bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg] transition-all duration-700 ease-out",
          isHovered && "left-[150%]"
        )}
      />

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm">
        {children}
      </span>
    </button>
  )
}
