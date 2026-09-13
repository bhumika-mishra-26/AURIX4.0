"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface StarBorderProps<T extends React.ElementType = "div"> {
  as?: T
  className?: string
  children?: React.ReactNode
  color?: string
  speed?: string
  thickness?: string
  glow?: boolean
  isActive?: boolean
}

export default function StarBorder<T extends React.ElementType = "div">({
  as,
  className = "",
  children,
  color = "#f97316",
  speed = "4s",
  thickness = "2px",
  glow = true,
  isActive = false,
  ...rest
}: StarBorderProps<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof StarBorderProps<T>>) {
  const Component = as || "div"

  return (
    <Component
      className={cn(
        "relative block overflow-hidden rounded-2xl p-[2px] transition-all duration-300 group cursor-pointer select-none",
        isActive
          ? "ring-2 ring-orange-500 shadow-[0_0_35px_rgba(249,115,22,0.45)] scale-[1.02]"
          : "border border-slate-850 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1.5",
        className
      )}
      {...rest}
    >
      {/* Animated Rotating Conic Gradient Star Border */}
      <div
        className={cn(
          "absolute inset-[-100%] animate-spin rounded-full pointer-events-none transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        style={{
          animationDuration: speed,
          animationTimingFunction: "linear",
          background: `conic-gradient(from 0deg, transparent 0 280deg, ${color} 330deg, transparent 360deg)`
        }}
      />

      {/* Secondary Glow Layer */}
      {glow && (
        <div
          className={cn(
            "absolute inset-[-50%] animate-spin rounded-full pointer-events-none blur-md transition-opacity duration-300",
            isActive ? "opacity-75" : "opacity-0 group-hover:opacity-50"
          )}
          style={{
            animationDuration: speed,
            animationTimingFunction: "linear",
            background: `conic-gradient(from 180deg, transparent 0 280deg, ${color} 330deg, transparent 360deg)`
          }}
        />
      )}

      {/* Inner Mask Content Container */}
      <div className={cn(
        "relative z-10 w-full h-full rounded-[calc(1rem-2px)] backdrop-blur-md transition-colors duration-300",
        isActive
          ? "bg-slate-900/95 dark:bg-slate-950/95"
          : "bg-slate-900/80 dark:bg-slate-950/80 group-hover:bg-slate-900/95"
      )}>
        {children}
      </div>
    </Component>
  )
}
